import React from "react";

export default function LandmarksApproachTable({
  approachE = "",
  approachW = "",
  approachN = "",
  approachS = "",
  fireStnName = "",
  fireStnDist = "",
  policeStnName = "",
  policeStnDist = "",
  hospitalName = "",
  hospitalDist = "",
  gateWidth = "",
  leftDrive = "",
  rightDrive = "",
  frontRoad = "",
  backRoad = "",
  onChangeApproachE,
  onChangeApproachW,
  onChangeApproachN,
  onChangeApproachS,
  onChangeFireStnName,
  onChangeFireStnDist,
  onChangePoliceStnName,
  onChangePoliceStnDist,
  onChangeHospitalName,
  onChangeHospitalDist,
  onChangeGateWidth,
  onChangeLeftDrive,
  onChangeRightDrive,
  onChangeFrontRoad,
  onChangeBackRoad,
  onCommitApproachE,
  onCommitApproachW,
  onCommitApproachN,
  onCommitApproachS,
  onCommitFireStnName,
  onCommitFireStnDist,
  onCommitPoliceStnName,
  onCommitPoliceStnDist,
  onCommitHospitalName,
  onCommitHospitalDist,
  onCommitGateWidth,
  onCommitLeftDrive,
  onCommitRightDrive,
  onCommitFrontRoad,
  onCommitBackRoad
}) {
  const baseCell = {
    border: "1px solid #000",
    padding: "10px",
    fontSize: "13px",
    verticalAlign: "middle"
  };

  // removed colored header usage

  const labelBandCell = {
    ...baseCell,
    fontWeight: "700",
    width: "120px",
    textAlign: "center"
  };

  const labelCell = {
    ...baseCell,
    fontWeight: "600",
    width: "160px"
  };

  const valueCell = {
    ...baseCell,
    textAlign: "center"
  };

  const inputStyle = { width: "100%", border: "1px solid #000", padding: "6px" };
  // removed directional colored labels

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      
      <tbody>
        <tr>
          <td style={labelBandCell}>(a)</td>
          <td style={labelCell}>Landmark</td>
          <td style={valueCell}>
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>EAST</div>
            <input
              type="text"
              defaultValue={approachE}
              placeholder="NA"
              onChange={e => onChangeApproachE && onChangeApproachE(e.target.value)}
              onBlur={e => onCommitApproachE && onCommitApproachE(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>WEST</div>
            <input
              type="text"
              defaultValue={approachW}
              placeholder="NA"
              onChange={e => onChangeApproachW && onChangeApproachW(e.target.value)}
              onBlur={e => onCommitApproachW && onCommitApproachW(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>SOUTH</div>
            <input
              type="text"
              defaultValue={approachS}
              placeholder="NA"
              onChange={e => onChangeApproachS && onChangeApproachS(e.target.value)}
              onBlur={e => onCommitApproachS && onCommitApproachS(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>NORTH</div>
            <input
              type="text"
              defaultValue={approachN}
              placeholder="NA"
              onChange={e => onChangeApproachN && onChangeApproachN(e.target.value)}
              onBlur={e => onCommitApproachN && onCommitApproachN(e.target.value)}
              style={inputStyle}
            />
          </td>
        </tr>
        <tr>
          <td style={labelBandCell}>(b)</td>
          <td style={labelCell}>Approach Roads (m)</td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={leftDrive}
              placeholder="NA"
              onChange={e => onChangeLeftDrive && onChangeLeftDrive(e.target.value)}
              onBlur={e => onCommitLeftDrive && onCommitLeftDrive(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={rightDrive}
              placeholder="NA"
              onChange={e => onChangeRightDrive && onChangeRightDrive(e.target.value)}
              onBlur={e => onCommitRightDrive && onCommitRightDrive(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={frontRoad}
              placeholder="NA"
              onChange={e => onChangeFrontRoad && onChangeFrontRoad(e.target.value)}
              onBlur={e => onCommitFrontRoad && onCommitFrontRoad(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={backRoad}
              placeholder="NA"
              onChange={e => onChangeBackRoad && onChangeBackRoad(e.target.value)}
              onBlur={e => onCommitBackRoad && onCommitBackRoad(e.target.value)}
              style={inputStyle}
            />
          </td>
        </tr>
        <tr>
          <td style={labelBandCell}>(c)</td>
          <td style={labelCell}>Nearest Fire</td>
          <td style={valueCell}>Name</td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={fireStnName}
              placeholder="NA"
              onChange={e => onChangeFireStnName && onChangeFireStnName(e.target.value)}
              onBlur={e => onCommitFireStnName && onCommitFireStnName(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>Distance</td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={fireStnDist}
              placeholder="NA"
              onChange={e => onChangeFireStnDist && onChangeFireStnDist(e.target.value)}
              onBlur={e => onCommitFireStnDist && onCommitFireStnDist(e.target.value)}
              style={inputStyle}
            />
          </td>
        </tr>
        <tr>
          <td style={labelBandCell}>(d)</td>
          <td style={labelCell}>Nearest Police station</td>
          <td style={valueCell}>Name</td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={policeStnName}
              placeholder="NA"
              onChange={e => onChangePoliceStnName && onChangePoliceStnName(e.target.value)}
              onBlur={e => onCommitPoliceStnName && onCommitPoliceStnName(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>Distance</td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={policeStnDist}
              placeholder="NA"
              onChange={e => onChangePoliceStnDist && onChangePoliceStnDist(e.target.value)}
              onBlur={e => onCommitPoliceStnDist && onCommitPoliceStnDist(e.target.value)}
              style={inputStyle}
            />
          </td>
        </tr>
        <tr>
          <td style={labelBandCell}>(e)</td>
          <td style={labelCell}>Nearest Hospital</td>
          <td style={valueCell}>Name</td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={hospitalName}
              placeholder="NA"
              onChange={e => onChangeHospitalName && onChangeHospitalName(e.target.value)}
              onBlur={e => onCommitHospitalName && onCommitHospitalName(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>Distance</td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={hospitalDist}
              placeholder="NA"
              onChange={e => onChangeHospitalDist && onChangeHospitalDist(e.target.value)}
              onBlur={e => onCommitHospitalDist && onCommitHospitalDist(e.target.value)}
              style={inputStyle}
            />
          </td>
        </tr>
        <tr>
          <td style={labelBandCell}>(f)</td>
          <td style={labelCell}>Width of the main entrance gate (m)</td>
          <td colSpan={4} style={{ ...valueCell, textAlign: "left" }}>
            <input
              type="text"
              defaultValue={gateWidth}
              placeholder="NA"
              onChange={e => onChangeGateWidth && onChangeGateWidth(e.target.value)}
              onBlur={e => onCommitGateWidth && onCommitGateWidth(e.target.value)}
              style={inputStyle}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
