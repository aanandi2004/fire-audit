from firebase_admin import firestore
from typing import Dict, Any, List

SCORE_MAP = {
    "In Place": 5,
    "Partially In Place": 3,
    "Not In Place": 0,
    "Not Relevant": 5,
}

def get_clean_qid(raw_id: str) -> str:
    s = str(raw_id or "").strip().upper()
    return s.split("-")[-1] if "-" in s else s

def _normalize_status(v: Any) -> str:
    if isinstance(v, dict):
        v = v.get("status") or v.get("answer")
    s = str(v or "").strip()
    up = s.upper().replace("-", "_").replace(" ", "_")
    if up in {"IN_PLACE", "INPLACE", "YES", "TRUE"}:
        return "In Place"
    if up in {"PARTIALLY_IN_PLACE", "PARTIAL"}:
        return "Partially In Place"
    if up in {"NOT_IN_PLACE", "NO", "FALSE"}:
        return "Not In Place"
    if up in {"NOT_RELEVANT", "NA", "NOT_APPLICABLE"}:
        return "Not Relevant"
    return s if s in SCORE_MAP else "Not In Place"

def _load_question_defs(db) -> Dict[str, Dict[str, Any]]:
    defs: Dict[str, Dict[str, Any]] = {}
    try:
        for snap in db.collection("self_assessment_questions").stream():
            d = snap.to_dict() or {}
            qid = str(d.get("question_id") or snap.id).strip().upper()
            defs[qid] = {
                "requirement": d.get("question_text") or d.get("requirement") or "",
                "section": d.get("section") or d.get("category") or "General",
                "order": d.get("order") if isinstance(d.get("order"), int) else 999,
            }
    except Exception:
        pass
    base = dict(defs)
    for k, v in base.items():
        ck = k.split("-")[-1]
        if ck and ck not in defs:
            defs[ck] = v
    return defs

def build_context_for_final_report(audit_id: str) -> Dict[str, Any]:
    db = firestore.client()
    if not audit_id:
        raise ValueError("Missing audit_id")
    blocks_ref = db.collection("audit_responses").document(audit_id).collection("blocks")
    try:
        block_docs = list(blocks_ref.list_documents())
    except Exception:
        block_docs = []
    if not block_docs:
        raise ValueError(f"No data found in blocks for audit: {audit_id}")
    defs = _load_question_defs(db)
    org_id = ""
    try:
        asg = db.collection("assignments").document(str(audit_id).strip()).get()
        if asg.exists:
            adata = asg.to_dict() or {}
            org_id = adata.get("org_id") or ""
    except Exception:
        pass
    organization = {"name": "Unknown Organization"}
    if org_id:
        osnap = db.collection("organizations").document(org_id).get()
        if osnap.exists:
            odata = osnap.to_dict() or {}
            organization["name"] = odata.get("name") or odata.get("org_name") or ""
    cat_org_init: Dict[str, Dict[str, float]] = {}
    cat_aud_init: Dict[str, Dict[str, float]] = {}
    cat_org_final: Dict[str, Dict[str, float]] = {}
    cat_aud_final: Dict[str, Dict[str, float]] = {}
    rows: List[Dict[str, Any]] = []
    blocks_payload: List[Dict[str, Any]] = []
    building_profile: Dict[str, Any] = {}
    for b in block_docs:
        local_rows: List[Dict[str, Any]] = []
        qs = list(b.collection("questions").stream())
        for q in qs:
            d = q.to_dict() or {}
            raw_qid = str(d.get("question_id") or q.id).strip().upper()
            qdef = defs.get(raw_qid) or defs.get(get_clean_qid(raw_qid)) or {}
            section_name = str(d.get("section") or qdef.get("section") or d.get("category_label") or d.get("category") or "General").strip()
            sname_lower = section_name.lower()
            excluded = sname_lower in {"building details", "type of construction"}
            org_status = _normalize_status((d.get("org") or {}).get("status") or d.get("customer_status") or d.get("status"))
            aud_status = _normalize_status((d.get("auditor") or {}).get("status") or d.get("auditor_status"))
            org_final_status = _normalize_status(
                (d.get("org") or {}).get("final_status")
                or (d.get("org") or {}).get("closure_verification")
                or (d.get("closure") or {}).get("org_status")
                or d.get("final_status")
                or d.get("closure_verification")
            )
            aud_final_status = _normalize_status(
                (d.get("auditor") or {}).get("final_status")
                or (d.get("auditor") or {}).get("closure_verification")
                or (d.get("auditor") or {}).get("closure_status")
                or (d.get("closure") or {}).get("final_status")
            )
            auditor_meta = (d.get("auditor") or {})
            closure_details = str(
                d.get("closure_remarks")
                or d.get("action_taken")
                or auditor_meta.get("remark")
                or d.get("auditor_observation")
                or d.get("auditor_comment")
                or ""
            ).strip()
            auditor_closure_status = str(
                auditor_meta.get("final_status")
                or auditor_meta.get("closure_verification")
                or auditor_meta.get("closure_status")
                or ""
            ).strip()
            if excluded:
                val = str((d.get("org") or {}).get("value") or d.get("value") or "").strip()
                key = (qdef.get("requirement") or d.get("question_text") or raw_qid).strip()
                if key:
                    building_profile[key] = val
                continue
            cat_org_init.setdefault(section_name, {"total": 0, "IP": 0.0, "PI": 0.0, "NR": 0.0})
            cat_org_init[section_name]["total"] += 1
            if org_status == "Not Relevant":
                cat_org_init[section_name]["NR"] += 1
            elif org_status == "In Place":
                cat_org_init[section_name]["IP"] += 1
            elif org_status == "Partially In Place":
                cat_org_init[section_name]["PI"] += 1
            cat_aud_init.setdefault(section_name, {"total": 0, "IP": 0.0, "PI": 0.0, "NR": 0.0})
            cat_aud_init[section_name]["total"] += 1
            if aud_status == "Not Relevant":
                cat_aud_init[section_name]["NR"] += 1
            elif aud_status == "In Place":
                cat_aud_init[section_name]["IP"] += 1
            elif aud_status == "Partially In Place":
                cat_aud_init[section_name]["PI"] += 1
            cat_org_final.setdefault(section_name, {"total": 0, "IP": 0.0, "PI": 0.0, "NR": 0.0})
            cat_org_final[section_name]["total"] += 1
            if org_final_status == "Not Relevant":
                cat_org_final[section_name]["NR"] += 1
            elif org_final_status == "In Place":
                cat_org_final[section_name]["IP"] += 1
            elif org_final_status == "Partially In Place":
                cat_org_final[section_name]["PI"] += 1
            cat_aud_final.setdefault(section_name, {"total": 0, "IP": 0.0, "PI": 0.0, "NR": 0.0})
            cat_aud_final[section_name]["total"] += 1
            if aud_final_status == "Not Relevant":
                cat_aud_final[section_name]["NR"] += 1
            elif aud_final_status == "In Place":
                cat_aud_final[section_name]["IP"] += 1
            elif aud_final_status == "Partially In Place":
                cat_aud_final[section_name]["PI"] += 1
            observation = ""
            if org_status != aud_status:
                observation = str(auditor_meta.get("observation") or auditor_meta.get("remark") or d.get("auditor_observation") or d.get("auditor_comment") or "").strip()
            data_value = str((d.get("org") or {}).get("value") or d.get("value") or "").strip()
            base_row = {
                "section": section_name,
                "description": (qdef.get("requirement") or d.get("question_text") or f"ID: {raw_qid}").strip(),
                "target": 5,
                "org_score": int(SCORE_MAP.get(org_status, 0)),
                "org_status": org_status,
                "auditor_score": int(SCORE_MAP.get(aud_status, 0)),
                "auditor_status": aud_status,
                "observation": observation,
                "closure_details": closure_details,
                "auditor_closure_status": auditor_closure_status,
                "data_value": data_value,
                "order": qdef.get("order") if isinstance(qdef.get("order"), int) else (d.get("order") if isinstance(d.get("order"), int) else 999),
            }
            rows.append(dict(base_row))
            local_rows.append(dict(base_row))
        local_rows.sort(key=lambda x: x["order"])
        grouped_local: Dict[str, List[Dict[str, Any]]] = {}
        for r in local_rows:
            grouped_local.setdefault(r["section"], []).append(r)
        blocks_payload.append({
            "name": b.id,
            "grouped_sections": grouped_local
        })
    rows.sort(key=lambda x: x["order"])
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for r in rows:
        grouped.setdefault(r["section"], []).append(r)
    comp: List[Dict[str, Any]] = []
    for name in sorted(set(list(cat_org_init.keys()) + list(cat_aud_init.keys()) + list(cat_org_final.keys()) + list(cat_aud_final.keys()))):
        o_i = cat_org_init.get(name, {"total": 0, "IP": 0.0, "PI": 0.0, "NR": 0.0})
        a_i = cat_aud_init.get(name, {"total": 0, "IP": 0.0, "PI": 0.0, "NR": 0.0})
        o_f = cat_org_final.get(name, {"total": 0, "IP": 0.0, "PI": 0.0, "NR": 0.0})
        a_f = cat_aud_final.get(name, {"total": 0, "IP": 0.0, "PI": 0.0, "NR": 0.0})
        o_i_eff = int(o_i["total"] - o_i["NR"]); a_i_eff = int(a_i["total"] - a_i["NR"])
        o_f_eff = int(o_f["total"] - o_f["NR"]); a_f_eff = int(a_f["total"] - a_f["NR"])
        o_i_earned = o_i["IP"] + 0.5 * o_i["PI"]; a_i_earned = a_i["IP"] + 0.5 * a_i["PI"]
        o_f_earned = o_f["IP"] + 0.5 * o_f["PI"]; a_f_earned = a_f["IP"] + 0.5 * a_f["PI"]
        comp.append({
            "name": name,
            "org_initial_percentage": int(round((o_i_earned * 100) / o_i_eff)) if o_i_eff > 0 else 0,
            "auditor_initial_percentage": int(round((a_i_earned * 100) / a_i_eff)) if a_i_eff > 0 else 0,
            "org_final_percentage": int(round((o_f_earned * 100) / o_f_eff)) if o_f_eff > 0 else 0,
            "auditor_final_percentage": int(round((a_f_earned * 100) / a_f_eff)) if a_f_eff > 0 else 0,
        })
    ctx = {
        "organization": organization,
        "block": {"name": blocks_payload[0]["name"] if blocks_payload else block_docs[0].id},
        "grouped_sections": grouped,
        "comparison_categories": comp,
        "blocks": blocks_payload,
        "building_profile": building_profile,
    }
    # Reuse the same building placeholders as initial report, to keep layout compatibility
    try:
        org_id_for_placeholders = ""
        block_name = ""
        block_id = ""
        try:
            asg = db.collection("assignments").document(str(audit_id).strip()).get()
            if asg.exists:
                adata = asg.to_dict() or {}
                org_id_for_placeholders = str(adata.get("org_id") or "")
                block_id = str(adata.get("block_id") or "")
                block_name = str(adata.get("block_name") or block_id or "")
        except Exception:
            pass
        building_fields: Dict[str, Any] = {}
        try:
            target_block_id = block_id or (block_name.lower().replace(" ", "_") if block_name else "")
            if not target_block_id and block_docs:
                target_block_id = block_docs[0].id
            if target_block_id:
                prof = blocks_ref.document(target_block_id).collection("building_details").document("profile").get()
                if prof.exists:
                    pd = prof.to_dict() or {}
                    if isinstance(pd.get("fields"), dict):
                        building_fields = pd.get("fields") or {}
        except Exception:
            building_fields = {}
        org_doc = {}
        if org_id_for_placeholders:
            try:
                osnap = db.collection("organizations").document(org_id_for_placeholders).get()
                if osnap.exists:
                    org_doc = osnap.to_dict() or {}
            except Exception:
                org_doc = {}
        def _na(v: Any) -> str:
            try:
                s = str(v or "").strip()
            except Exception:
                s = ""
            return s if s else "NA"
        placeholders: Dict[str, Any] = {}
        placeholders["BLOCK_NAME"] = _na(block_name or (blocks_payload[0]["name"] if blocks_payload else block_docs[0].id))
        placeholders["P1_NAME_BUILDING"] = _na(building_fields.get("bldg_name") or org_doc.get("building_name") or org_doc.get("name"))
        placeholders["P1_ADDR_BUILDING"] = _na(building_fields.get("bldg_address") or org_doc.get("address") or org_doc.get("bldg_address"))
        placeholders["P1_TELEPHONE"] = _na(building_fields.get("bldg_phone") or org_doc.get("phone") or org_doc.get("bldg_phone"))
        placeholders["P1_EMAIL"] = _na(building_fields.get("bldg_email") or org_doc.get("email") or org_doc.get("bldg_email"))
        placeholders["P1_WEBSITE"] = _na(building_fields.get("bldg_website") or org_doc.get("website") or org_doc.get("bldg_website"))
        placeholders["P1_EST_TYPE"] = _na(building_fields.get("type_of_building") or org_doc.get("building_type") or org_doc.get("type_of_building"))
        placeholders["P1_OWNERSHIP"] = _na(building_fields.get("ownership_type") or org_doc.get("ownership") or org_doc.get("ownership_type"))
        placeholders["P1_TOTAL_MANPOWER"] = _na(building_fields.get("total_manpower") or org_doc.get("total_manpower"))
        placeholders["P1_TOTAL_BUILDINGS"] = _na(building_fields.get("total_buildings") or org_doc.get("total_buildings"))
        placeholders["P1_TOTAL_DEPARTMENTS"] = _na(building_fields.get("total_departments") or org_doc.get("total_departments"))
        placeholders["P1_TOTAL_AREA"] = _na(building_fields.get("total_area") or org_doc.get("total_area"))
        placeholders["P1_BUILT_UP_AREA"] = _na(building_fields.get("built_up_area") or org_doc.get("built_up_area"))
        placeholders["P1_BUILD_COUNT"] = _na(building_fields.get("building_count") or org_doc.get("building_count"))
        placeholders["P1_BUILD_1_NAME"] = _na(building_fields.get("building_1_name") or org_doc.get("building_1_name"))
        placeholders["P1_BUILD_1_HEIGHT"] = _na(building_fields.get("building_1_height") or org_doc.get("building_1_height"))
        placeholders["P1_BUILD_2_NAME"] = _na(building_fields.get("building_2_name") or org_doc.get("building_2_name"))
        placeholders["P1_BUILD_2_HEIGHT"] = _na(building_fields.get("building_2_height") or org_doc.get("building_2_height"))
        placeholders["P1_CONTACT_PLANT_HEAD"] = _na(building_fields.get("plant_head") or org_doc.get("plant_head"))
        placeholders["P1_CONTACT_AUDIT_PERSON"] = _na(building_fields.get("fire_audit_contact") or org_doc.get("fire_audit_contact"))
        placeholders["P1_LANDMARK_E"] = _na(building_fields.get("landmark_e") or org_doc.get("landmark_e"))
        placeholders["P1_LANDMARK_W"] = _na(building_fields.get("landmark_w") or org_doc.get("landmark_w"))
        placeholders["P1_LANDMARK_S"] = _na(building_fields.get("landmark_s") or org_doc.get("landmark_s"))
        placeholders["P1_LANDMARK_N"] = _na(building_fields.get("landmark_n") or org_doc.get("landmark_n"))
        placeholders["P1_APPROACH_E"] = _na(building_fields.get("approach_e") or org_doc.get("approach_e"))
        placeholders["P1_APPROACH_W"] = _na(building_fields.get("approach_w") or org_doc.get("approach_w"))
        placeholders["P1_APPROACH_S"] = _na(building_fields.get("approach_s") or org_doc.get("approach_s"))
        placeholders["P1_APPROACH_N"] = _na(building_fields.get("approach_n") or org_doc.get("approach_n"))
        placeholders["P1_FIRE_NAME"] = _na(building_fields.get("nearest_fire_name") or org_doc.get("nearest_fire_name"))
        placeholders["P1_FIRE_DIST"] = _na(building_fields.get("nearest_fire_distance") or org_doc.get("nearest_fire_distance"))
        placeholders["P1_POLICE_NAME"] = _na(building_fields.get("nearest_police_name") or org_doc.get("nearest_police_name"))
        placeholders["P1_POLICE_DIST"] = _na(building_fields.get("nearest_police_distance") or org_doc.get("nearest_police_distance"))
        placeholders["P1_HOSPITAL_NAME"] = _na(building_fields.get("nearest_hospital_name") or org_doc.get("nearest_hospital_name"))
        placeholders["P1_HOSPITAL_DIST"] = _na(building_fields.get("nearest_hospital_distance") or org_doc.get("nearest_hospital_distance"))
        placeholders["P1_GATE_WIDTH"] = _na(building_fields.get("main_gate_width") or org_doc.get("main_gate_width"))
        placeholders["P1_MAIN_SUB_CAP"] = _na(building_fields.get("substation_capacity") or org_doc.get("substation_capacity"))
        placeholders["P1_MAIN_SUB_MAKE"] = _na(building_fields.get("substation_make") or org_doc.get("substation_make"))
        placeholders["P1_MAIN_SUB_SOURCE"] = _na(building_fields.get("substation_source") or org_doc.get("substation_source"))
        placeholders["P1_MAIN_TR_CAP"] = _na(building_fields.get("transformer_capacity") or org_doc.get("transformer_capacity"))
        placeholders["P1_MAIN_TR_MAKE"] = _na(building_fields.get("transformer_make") or org_doc.get("transformer_make"))
        placeholders["P1_MAIN_TR_SOURCE"] = _na(building_fields.get("transformer_source") or org_doc.get("transformer_source"))
        placeholders["P1_MAIN_SOL_CAP"] = _na(building_fields.get("solar_capacity") or org_doc.get("solar_capacity"))
        placeholders["P1_MAIN_SOL_MAKE"] = _na(building_fields.get("solar_make") or org_doc.get("solar_make"))
        placeholders["P1_MAIN_SOL_SOURCE"] = _na(building_fields.get("solar_source") or org_doc.get("solar_source"))
        placeholders["P1_STBY_DG_CAP"] = _na(building_fields.get("dg_capacity") or org_doc.get("dg_capacity"))
        placeholders["P1_STBY_DG_MAKE"] = _na(building_fields.get("dg_make") or org_doc.get("dg_make"))
        placeholders["P1_STBY_DG_SOURCE"] = _na(building_fields.get("dg_source") or org_doc.get("dg_source"))
        placeholders["P1_STBY_UPS_CAP"] = _na(building_fields.get("ups_capacity") or org_doc.get("ups_capacity"))
        placeholders["P1_STBY_UPS_MAKE"] = _na(building_fields.get("ups_make") or org_doc.get("ups_make"))
        placeholders["P1_STBY_UPS_SOURCE"] = _na(building_fields.get("ups_source") or org_doc.get("ups_source"))
        placeholders["BUILDING_INFO_OCCUPANCY"] = _na(building_fields.get("occupancy") or org_doc.get("occupancy"))
        placeholders["BUILDING_INFO_TOTAL_DEPARTMENTS"] = _na(building_fields.get("total_departments") or org_doc.get("total_departments"))
        placeholders["BUILDING_INFO_DEPT_NAMES"] = _na(building_fields.get("department_names") or org_doc.get("department_names"))
        placeholders["BUILDING_INFO_TOTAL_PROCESS"] = _na(building_fields.get("total_process") or org_doc.get("total_process"))
        placeholders["BUILDING_INFO_TOTAL_PROCESS_OUTSOURCED"] = _na(building_fields.get("total_process_outsourced") or org_doc.get("total_process_outsourced"))
        placeholders["BUILDING_INFO_TOTAL_CONTRACTOR"] = _na(building_fields.get("total_contractor") or org_doc.get("total_contractor"))
        placeholders["CONST_OWN_BUILDING"] = _na(building_fields.get("own_building") or org_doc.get("own_building"))
        placeholders["CONST_LEASE"] = _na(building_fields.get("lease") or org_doc.get("lease"))
        placeholders["CONST_RENTAL"] = _na(building_fields.get("rental") or org_doc.get("rental"))
        placeholders["CONST_BUILT_UP_AREA"] = _na(building_fields.get("built_up_area") or org_doc.get("built_up_area"))
        placeholders["CONST_STRUCTURES_NUMBER"] = _na(building_fields.get("structures_number") or org_doc.get("structures_number"))
        placeholders["CONST_HEIGHT_METERS"] = _na(building_fields.get("bldg_height") or org_doc.get("bldg_height"))
        placeholders["CONST_FLOORS_INCL_BASEMENT"] = _na(building_fields.get("no_of_floors") or org_doc.get("no_of_floors"))
        ctx.update(placeholders)
    except Exception:
        pass
    return ctx
