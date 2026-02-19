export const ORGANIZATION_SECTIONS = [
  { id: 'name_address', label: '01 NAME AND ADDRESS OF THE BUILDING' },
  { id: 'year_establishment', label: '02 YEAR OF ESTABLISHMENT' },
  { id: 'contacts', label: '03 CONTACTS' },
  { id: 'landmark_access', label: '04 LANDMARK AND APPROACH ROADS TO THE BUILDING' },
  { id: 'power_main', label: '05 MAIN POWER SUPPLY' },
  { id: 'power_standby', label: '06 STANDBY POWER SUPPLY' },
  { id: 'general', label: 'I. BUILDING INFORMATION' },
  { id: 'occupancy', label: 'Nature of Occupancy' },
  { id: 'access', label: '3. ACCESS TO BUILDING' },
  { id: 'construction', label: 'II. CONSTRUCTION DETAILS OF THE BUILDING' },
  { id: 'ac_system', label: 'III. AIR CONDITIONING SYSTEM - BUILDING INFO' },
  { id: 'fire_protection', label: 'IV. FIRE PREVENTION AND FIRE PROTECTION INSTALLATIONS' },
  { id: 'ppe', label: 'V. PERSONAL PROTECTIVE EQUIPMENT PROVIDED' },
  { id: 'communications', label: 'VI. COMMUNICATIONS' },
  { id: 'chemicals', label: 'VII. CHEMICALS' },
  { id: 'drawings', label: 'VIII. DRAWINGS FOR VERIFICATION' },
  { id: 'legal_verification', label: 'IX. LEGAL FOR VERIFICATION' },
  { id: 'documents_list', label: 'III. LIST OF DOCUMENTS' },
  { id: 'basements', label: 'B BASEMENTS' },
  { id: 'kitchen', label: 'C KITCHEN' },
  { id: 'gas_storage', label: 'D GAS STORAGE' },
  { id: 'power', label: '6. POWER SUPPLY (MAIN & STANDBY)' },
  { id: 'kitchen_gas_ac', label: '7. KITCHEN, GAS & AC' },
  { id: 'fire_water_pumps', label: '8. FIRE WATER & PUMPS' },
  { id: 'hydrants', label: '9. HYDRANT SYSTEMS' },
  { id: 'detectors', label: '10. DETECTORS & ALARMS' },
  { id: 'sprinklers_extinguishers', label: '11. SPRINKLERS & EXTINGUISHERS' },
  { id: 'ppe_comm', label: '12. PPE & COMMUNICATIONS' },
  { id: 'legal', label: '13. LEGAL & DRAWINGS' }
]

export const ORGANIZATION_PARTS = [
  {
    id: 'part_i',
    label: 'PART I: BASIC DATA ABOUT THE BUILDING',
    sections: ['name_address', 'year_establishment', 'contacts', 'landmark_access', 'power_main', 'power_standby']
  },
  {
    id: 'part_ii',
    label: 'PART II: BASIC DATA ABOUT THE BUILDING',
    sections: ['general', 'construction', 'ac_system', 'fire_protection', 'ppe', 'communications', 'chemicals', 'drawings', 'legal_verification']
  },
  {
    id: 'part_iii',
    label: 'PART III: LIST OF DOCUMENTS',
    sections: ['documents_list']
  }
]

export const ORG_FIELD_LABELS = {
  bldg_name: 'Name of Building',
  bldg_address: 'Address of Building',
  bldg_phone: 'Telephone',
  bldg_email: 'Email ID',
  bldg_website: 'Website Address',
  year_established: 'Year of Establishment',
  year_type: 'Type of Building',
  year_ownership: 'Ownership Type (rented, leased, partially owned)',
  year_manpower: 'Total Manpower (Employees, Contractors)',
  year_total_buildings: 'Total No of Buildings',
  year_departments: 'Total No of Departments',
  year_total_area: 'Total Area',
  year_built_up_area: 'Built Up Area',
  year_b1_name: 'Building Name',
  year_b1_height: 'Building height (m)',
  year_b2_name: 'Building Name',
  year_b2_height: 'Building height (m)',
  year_no_building_details: 'No of Building and Details',
  year_no_floor: 'No of Floors',
  contact_plant_head: 'Plant Head',
  contact_fire_audit: 'Contact person for the Fire Audit',
  access_landmark: 'Landmark',
  access_road_width: 'Approach Road Width (m)',
  // General
  gen_name: 'Name of Organisation',
  gen_address: 'Address',
  gen_nature_occupancy: 'Nature of Occupancy',
  gen_departments: 'Total Departments',
  gen_department_names: 'Name of the Departments',
  gen_process_count: 'Total Number of Process',
  gen_process_outsourced: 'Total Number of Process Outsourced',
  gen_contractors: 'Contractors',
  gen_height: 'Height of Building (m)',
  gen_plot_area: 'Plot Area (sq m)',
  gen_built_up_area: 'Built Up Area (sq m)',

  // Occupancy
  occ_type: 'Type of Occupancy',

  // Access
  access_gate_width: 'Width of Main Entrance Gate (m)',
  access_approach_n: 'Approach Road - North (m)',
  access_approach_s: 'Approach Road - South (m)',
  access_approach_e: 'Approach Road - East (m)',
  access_approach_w: 'Approach Road - West (m)',
  access_fire_stn_name: 'Fire Station Name',
  access_fire_stn_dist: 'Fire Station Distance',
  access_police_stn_name: 'Police Station Name',
  access_police_stn_dist: 'Police Station Distance',
  access_hospital_name: 'Hospital Name',
  access_hospital_dist: 'Hospital Distance',

  // Construction
  const_ownership: 'Ownership Structure',
  const_own_bldg: 'Ownership of the Structure – Own Building',
  const_lease: 'Ownership of the Structure – Lease',
  const_rental: 'Ownership of the Structure – Rental',
  const_built_up: 'Built Up Area (sq m)',
  const_structures: 'Number of Structures',
  const_height: 'Height of Building (m)',
  const_floors: 'Floors (incl. basement)',
  const_ceiling_height: 'Ceiling Height (m)',
  const_ramp_no: 'No. of Ramps',
  const_ramp_width: 'Ramp Width',
  const_stair_no: 'No. of Staircases',
  const_stair_width: 'Staircase Width',
  const_lift_no: 'No. of Lifts',

  // Basement
  base_no: 'Number of Basements',
  base_area: 'Area (sq m)',
  base_height: 'Height (m)',
  base_util: 'Utility',
  base_materials: 'Materials Stored',
  base_approach: 'Approach',
  base_area_details: 'Area of Basement Details',
  base_util_carpark: 'Basement Utility – Car Park',
  base_util_storage: 'Basement Utility – Storage',
  base_util_office: 'Basement Utility – Office',
  base_mat_papers: 'Materials – Papers',
  base_mat_clothes: 'Materials – Clothes',
  base_mat_rags: 'Materials – Rags',
  base_mat_records: 'Materials – Records',
  base_mat_books: 'Materials – Books',
  base_mat_electronics: 'Materials – Electronics',
  base_mat_petrol: 'Materials – Petrol',
  base_mat_kerosene: 'Materials – Kerosene',
  base_mat_ganders: 'Materials – Ganders',
  base_app_lifts: 'Approach – Lifts',
  base_app_staircase: 'Approach – Staircase',
  base_app_driveway: 'Approach – Driveway',

  // Power
  power_sub_no: 'Substation (No.)',
  power_sub_cap: 'Substation (Capacity)',
  power_sub_make: 'Substation Make/Brand',
  power_sub_source: 'Substation Source of Supply',
  power_trans_no: 'Transformer (No.)',
  power_trans_cap: 'Transformer (Capacity)',
  power_trans_make: 'Transformer Make/Brand',
  power_trans_source: 'Transformer Source of Supply',
  power_solar_no: 'Solar (No.)',
  power_solar_cap: 'Solar (Capacity)',
  power_solar_make: 'Solar Make/Brand',
  power_solar_source: 'Solar Source of Supply',
  power_gen_no: 'Generator (No.)',
  power_gen_cap: 'Generator (Capacity)',
  power_gen_make: 'Generator Make/Brand',
  power_gen_source: 'Generator Source of Supply',
  power_inv_no: 'Inverter (No.)',
  power_inv_cap: 'Inverter (Capacity)',
  power_inv_make: 'Inverter Make/Brand',
  power_inv_source: 'Inverter Source of Supply',
  power_solar_st_no: 'Standby Solar (No.)',
  power_solar_st_cap: 'Standby Solar (Capacity)',
  power_solar_st_make: 'Standby Solar Make/Brand',
  power_solar_st_source: 'Standby Solar Source of Supply',

  // Kitchen/Gas/AC
  kit_avail: 'Kitchen Available?',
  kit_loc: 'Kitchen Location',
  kit_fuel: 'Kitchen Fuel Used',
  gas_type: 'Type of Gas',
  gas_storage: 'Gas Storage Method',
  ac_ahu: 'AHU',
  ac_central: 'Centralised AC',
  ac_window: 'Window AC',
  ac_split: 'Split AC',

  // Water/Pumps
  water_ug_qty: 'Underground Tanks (Qty)',
  water_terrace_qty: 'Terrace Tanks (Qty)',
  pump_main_cap: 'Main Fire Pump Capacity',
  pump_main_head: 'Main Fire Pump Head',
  pump_main_rpm: 'Main Fire Pump RPM',
  pump_main_make: 'Main Fire Pump Make',
  pump_main_status: 'Main Fire Pump Status',
  pump_diesel_cap: 'Diesel Fire Pump Capacity',
  pump_diesel_head: 'Diesel Fire Pump Head',
  pump_diesel_rpm: 'Diesel Fire Pump RPM',
  pump_diesel_make: 'Diesel Fire Pump Make',
  pump_diesel_status: 'Diesel Fire Pump Status',
  pump_sprinkler_cap: 'Sprinkler Pump Capacity',
  pump_sprinkler_head: 'Sprinkler Pump Head',
  pump_sprinkler_rpm: 'Sprinkler Pump RPM',
  pump_sprinkler_make: 'Sprinkler Pump Make',
  pump_sprinkler_status: 'Sprinkler Pump Status',
  pump_jockey_cap: 'Jockey Pump Capacity',
  pump_jockey_head: 'Jockey Pump Head',
  pump_jockey_rpm: 'Jockey Pump RPM',
  pump_jockey_make: 'Jockey Pump Make',
  pump_jockey_status: 'Jockey Pump Status',
  pump_booster_cap: 'Booster Pump Capacity',
  pump_booster_head: 'Booster Pump Head',
  pump_booster_rpm: 'Booster Pump RPM',
  pump_booster_make: 'Booster Pump Make',
  pump_booster_status: 'Booster Pump Status',

  // Hydrants
  hyd_wet: 'Wet Riser',
  hyd_dry: 'Dry Riser',
  hyd_down: 'Down Comer',
  hyd_hose_reel: 'Hose Reels',
  hyd_box_s: 'Hose Box (Single)',
  hyd_box_d: 'Hose Box (Double)',
  hyd_landing: 'Landing Valves',
  hyd_yard: 'Yard Hydrants',
  hyd_monitor: 'Fire Monitors',

  // Detectors
  det_smoke: 'Smoke Detectors',
  det_heat: 'Heat Detectors',
  det_alarm: 'Fire Alarms',
  det_mcp: 'Manual Call Points',
  det_gas: 'Gas Detectors',
  det_lpg: 'LPG Detectors',

  // Sprinklers
  spr_pendent: 'Pendent Type',
  spr_sidewall: 'Sidewall Type',
  spr_concealed: 'Concealed Type',
  spr_other: 'Other Sprinklers',

  // Extinguishers
  ext_foam: 'Foam Type',
  ext_co2: 'CO2 Type',
  ext_clean: 'Clean Agents',
  ext_bucket: 'Fire Buckets',
  ext_dcp: 'Dry Chemical Powder',

  // PPE
  ppe_helmet: 'Helmets / Hard Hats',
  ppe_goggle: 'Safety Goggles',
  ppe_ear: 'Ear Plugs / Ear Muffs',
  ppe_mask: 'Face Shields',
  ppe_glove: 'Hand Gloves',
  ppe_boot: 'Gum Boots',
  ppe_ba: 'Breathing Apparatus',
  ppe_apron: 'Aprons / Coveralls',
  ppe_belt: 'Safety Belts',
  ppe_shoe: 'Safety Shoes',
  ppe_other: 'Others',
  
  // Comm
  comm_cctv: 'CCTV',
  comm_fire_alarm: 'Fire Alarm',
  comm_pa: 'PA System',
  // Drawings
  draw_floor: 'Floor Plan',
  draw_service: 'Service line drawing',

  // Legal
  legal_factory: 'Factory License',
  legal_stability: 'Building Stability Cert',
  legal_fire_noc: 'Fire NOC'
}

export const SECTION_FIELDS = {
  name_address: ['bldg_name', 'bldg_address', 'bldg_phone', 'bldg_email', 'bldg_website'],
  year_establishment: [
    'year_established',
    'year_type',
    'year_ownership',
    'year_manpower',
    'year_total_buildings',
    'year_departments',
    'year_total_area',
    'year_built_up_area',
    'year_b1_name', 'year_b1_height',
    'year_b2_name', 'year_b2_height',
    'year_no_building_details',
    'year_no_floor'
  ],
  contacts: ['contact_plant_head', 'contact_fire_audit'],
  landmark_access: [
    'access_landmark',
    'access_approach_e', 'access_approach_w', 'access_approach_n', 'access_approach_s',
    'access_fire_stn_name', 'access_fire_stn_dist',
    'access_police_stn_name', 'access_police_stn_dist',
    'access_hospital_name', 'access_hospital_dist',
    'access_gate_width'
  ],
  power_main: [
    'power_sub_no', 'power_sub_cap', 'power_sub_make', 'power_sub_source',
    'power_trans_no', 'power_trans_cap', 'power_trans_make', 'power_trans_source',
    'power_solar_no', 'power_solar_cap', 'power_solar_make', 'power_solar_source'
  ],
  power_standby: [
    'power_gen_no', 'power_gen_cap', 'power_gen_make', 'power_gen_source',
    'power_inv_no', 'power_inv_cap', 'power_inv_make', 'power_inv_source',
    'power_solar_st_no', 'power_solar_st_cap', 'power_solar_st_make', 'power_solar_st_source'
  ],
  general: ['gen_nature_occupancy', 'gen_departments', 'gen_department_names', 'gen_process_count', 'gen_process_outsourced', 'gen_contractors'],
  occupancy: ['occ_type'],
  access: ['access_gate_width', 'access_approach_n', 'access_approach_s', 'access_approach_e', 'access_approach_w', 'access_fire_stn_name', 'access_fire_stn_dist', 'access_police_stn_name', 'access_police_stn_dist', 'access_hospital_name', 'access_hospital_dist'],
  construction: ['const_ownership', 'const_built_up', 'const_structures', 'const_height', 'const_floors', 'const_ceiling_height', 'const_ramp_no', 'const_ramp_width', 'const_stair_no', 'const_stair_width', 'const_lift_no'],
  basements: ['base_no', 'base_area', 'base_height', 'base_util', 'base_materials', 'base_approach'],
  power: ['power_sub_no', 'power_sub_cap', 'power_trans_no', 'power_trans_cap', 'power_solar_no', 'power_solar_cap', 'power_gen_no', 'power_gen_cap', 'power_inv_no', 'power_inv_cap'],
  kitchen_gas_ac: ['kit_avail', 'kit_loc', 'kit_fuel', 'gas_type', 'gas_storage', 'ac_ahu', 'ac_central', 'ac_window', 'ac_split'],
  ac_system: ['ac_ahu', 'ac_central', 'ac_window', 'ac_split'],
  kitchen: ['kit_avail', 'kit_loc', 'kit_fuel'],
  gas_storage: ['gas_type', 'gas_storage'],
  fire_water_pumps: ['water_ug_qty', 'water_terrace_qty', 'pump_main_cap', 'pump_diesel_cap', 'pump_sprinkler_cap', 'pump_jockey_cap', 'pump_booster_cap'],
  hydrants: ['hyd_wet', 'hyd_dry', 'hyd_down', 'hyd_hose_reel', 'hyd_box_s', 'hyd_box_d', 'hyd_landing', 'hyd_yard', 'hyd_monitor'],
  detectors: ['det_smoke', 'det_heat', 'det_alarm', 'det_mcp', 'det_gas', 'det_lpg'],
  sprinklers_extinguishers: ['spr_pendent', 'spr_sidewall', 'spr_concealed', 'spr_other', 'ext_foam', 'ext_co2', 'ext_clean', 'ext_bucket', 'ext_dcp'],
  ppe: ['ppe_helmet', 'ppe_goggle', 'ppe_ear', 'ppe_mask', 'ppe_glove', 'ppe_boot', 'ppe_shoe', 'ppe_apron', 'ppe_ba', 'ppe_belt', 'ppe_other'],
  communications: ['comm_cctv', 'comm_fire_alarm', 'comm_pa'],
  drawings: ['draw_floor', 'draw_service'],
  legal_verification: ['legal_factory', 'legal_stability', 'legal_fire_noc'],
  ppe_comm: ['ppe_helmet', 'ppe_goggle', 'ppe_ba', 'ppe_shoe', 'comm_cctv', 'comm_pa'],
  legal: ['legal_factory', 'legal_stability', 'legal_fire_noc'],
  documents_list: []
}

export const DEFAULT_ORG_DATA = {
  // Part I
  bldg_name: '',
  bldg_address: '',
  bldg_phone: '',
  bldg_email: '',
  bldg_website: '',
  year_established: '',
  year_type: '',
  year_ownership: '',
  year_manpower: '',
  year_total_buildings: '',
  year_departments: '',
  year_total_area: '',
  year_built_up_area: '',
  year_b1_name: '',
  year_b1_height: '',
  year_b2_name: '',
  year_b2_height: '',
  year_no_building_details: '',
  year_no_floor: '',
  year_floor_b1_name: '',
  year_floor_b1_height: '',
  year_floor_b2_name: '',
  year_floor_b2_height: '',
  contact_plant_head: '',
  contact_fire_audit: '',
  access_landmark: '',

  // General
  gen_name: '', gen_address: '', gen_height: '', gen_plot_area: '', gen_built_up_area: '',
  gen_nature_occupancy: '', gen_departments: '', gen_department_names: '',
  gen_process_count: '', gen_process_outsourced: '', gen_contractors: '',

  // Occupancy & Access
  occ_type: '',
  access_road_width: '', access_gate_width: '',
  access_approach_n: '', access_approach_s: '', access_approach_e: '', access_approach_w: '',
  access_fire_stn_name: '', access_fire_stn_dist: '',
  access_police_stn_name: '', access_police_stn_dist: '',
  access_hospital_name: '', access_hospital_dist: '',

  // Power (Main)
  power_sub_no: '', power_sub_cap: '', power_sub_make: '', power_sub_source: '',
  power_trans_no: '', power_trans_cap: '', power_trans_make: '', power_trans_source: '',
  power_solar_no: '', power_solar_cap: '', power_solar_make: '', power_solar_source: '',
  // Power (Standby)
  power_gen_no: '', power_gen_cap: '', power_gen_make: '', power_gen_source: '',
  power_inv_no: '', power_inv_cap: '', power_inv_make: '', power_inv_source: '',
  power_solar_st_no: '', power_solar_st_cap: '', power_solar_st_make: '', power_solar_st_source: '',

  // Construction
  const_ownership: '',
  const_own_bldg: '',
  const_lease: '',
  const_rental: '',
  const_built_up: '',
  const_structures: '',
  const_height: '', 
  const_floors: '',
  const_ceiling_height: '',
  const_ramp_no: '', const_ramp_width: '',
  const_stair_no: '', const_stair_width: '',
  const_lift_no: '',

  // Basement
  base_no: '', base_area: '', base_height: '', 
  base_util: '', base_materials: '', base_approach: '',
  base_area_details: '',
  base_util_carpark: '',
  base_util_storage: '',
  base_util_office: '',
  base_mat_papers: '',
  base_mat_clothes: '',
  base_mat_rags: '',
  base_mat_records: '',
  base_mat_books: '',
  base_mat_electronics: '',
  base_mat_petrol: '',
  base_mat_kerosene: '',
  base_mat_ganders: '',
  base_app_lifts: '',
  base_app_staircase: '',
  base_app_driveway: '',

  // Kitchen/Gas/AC
  kit_avail: '', kit_loc: '', kit_fuel: '',
  gas_type: '', gas_storage: '',
  ac_ahu: '', ac_central: '', ac_window: '', ac_split: '',

  // Water/Pumps
  water_ug_qty: '', water_terrace_qty: '',
  pump_main_cap: '', pump_main_head: '', pump_main_rpm: '', pump_main_make: '', pump_main_status: '',
  pump_diesel_cap: '', pump_diesel_head: '', pump_diesel_rpm: '', pump_diesel_make: '', pump_diesel_status: '',
  pump_sprinkler_cap: '', pump_sprinkler_head: '', pump_sprinkler_rpm: '', pump_sprinkler_make: '', pump_sprinkler_status: '',
  pump_jockey_cap: '', pump_jockey_head: '', pump_jockey_rpm: '', pump_jockey_make: '', pump_jockey_status: '',
  pump_booster_cap: '', pump_booster_head: '', pump_booster_rpm: '', pump_booster_make: '', pump_booster_status: '',

  // Hydrants
  hyd_wet: '', hyd_dry: '', hyd_down: '', hyd_hose_reel: '', 
  hyd_box_s: '', hyd_box_d: '', hyd_landing: '', hyd_yard: '', hyd_monitor: '',

  // Detectors
  det_smoke: '', det_heat: '', det_alarm: '', det_mcp: '', det_gas: '', det_lpg: '',

  // Sprinklers
  spr_pendent: '', spr_sidewall: '', spr_concealed: '', spr_other: '',

  // Extinguishers
  ext_foam: '', ext_co2: '', ext_clean: '', ext_bucket: '', ext_dcp: '', ext_other: '',

  // PPE
  ppe_helmet: '', ppe_goggle: '', ppe_ear: '', ppe_mask: '', ppe_glove: '', ppe_boot: '', 
  ppe_shoe: '', ppe_apron: '', ppe_ba: '', ppe_belt: '', ppe_other: '',

  // Comm
  comm_cctv: '', comm_fire_alarm: '', comm_pa: '',
  chem_rows: [],
  draw_rows: [],
  draw_floor: '',
  draw_service: '',

  // Legal
  legal_factory: '', legal_stability: '', legal_fire_noc: ''
}
