import React from "react";

export default function StandbyPowerSupplyTable({
  genCapacity = "",
  genMake = "",
  genSource = "",
  invCapacity = "",
  invMake = "",
  invSource = "",
  solarCapacity = "",
  solarMake = "",
  solarSource = "",
  onChangeGenCapacity,
  onChangeGenMake,
  onChangeGenSource,
  onChangeInvCapacity,
  onChangeInvMake,
  onChangeInvSource,
  onChangeSolarCapacity,
  onChangeSolarMake,
  onChangeSolarSource,
  onCommitGenCapacity,
  onCommitGenMake,
  onCommitGenSource,
  onCommitInvCapacity,
  onCommitInvMake,
  onCommitInvSource,
  onCommitSolarCapacity,
  onCommitSolarMake,
  onCommitSolarSource
}) {
  const baseCell = {
    border: "1px solid #000",
    padding: "10px",
    fontSize: "13px",
    verticalAlign: "middle"
  };

  const labelBandCell = {
    ...baseCell,
    fontWeight: "700",
    width: "80px",
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

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <thead>
        <tr>
          <th style={{ ...labelCell, textAlign: "center" }}>Sr.</th>
          <th style={{ ...labelCell, textAlign: "center" }}>Type</th>
          <th style={{ ...labelCell, textAlign: "center" }}>Capacity</th>
          <th style={{ ...labelCell, textAlign: "center" }}>Make / Brand</th>
          <th style={{ ...labelCell, textAlign: "center" }}>Source of Supply</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={labelBandCell}>(a)</td>
          <td style={labelCell}>Generator</td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={genCapacity}
              placeholder="NA"
              onChange={e => onChangeGenCapacity && onChangeGenCapacity(e.target.value)}
              onBlur={e => onCommitGenCapacity && onCommitGenCapacity(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={genMake}
              placeholder="NA"
              onChange={e => onChangeGenMake && onChangeGenMake(e.target.value)}
              onBlur={e => onCommitGenMake && onCommitGenMake(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={genSource}
              placeholder="NA"
              onChange={e => onChangeGenSource && onChangeGenSource(e.target.value)}
              onBlur={e => onCommitGenSource && onCommitGenSource(e.target.value)}
              style={inputStyle}
            />
          </td>
        </tr>
        <tr>
          <td style={labelBandCell}>(b)</td>
          <td style={labelCell}>Inverter</td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={invCapacity}
              placeholder="NA"
              onChange={e => onChangeInvCapacity && onChangeInvCapacity(e.target.value)}
              onBlur={e => onCommitInvCapacity && onCommitInvCapacity(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={invMake}
              placeholder="NA"
              onChange={e => onChangeInvMake && onChangeInvMake(e.target.value)}
              onBlur={e => onCommitInvMake && onCommitInvMake(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={invSource}
              placeholder="NA"
              onChange={e => onChangeInvSource && onChangeInvSource(e.target.value)}
              onBlur={e => onCommitInvSource && onCommitInvSource(e.target.value)}
              style={inputStyle}
            />
          </td>
        </tr>
        <tr>
          <td style={labelBandCell}>(c)</td>
          <td style={labelCell}>Solar</td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={solarCapacity}
              placeholder="NA"
              onChange={e => onChangeSolarCapacity && onChangeSolarCapacity(e.target.value)}
              onBlur={e => onCommitSolarCapacity && onCommitSolarCapacity(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={solarMake}
              placeholder="NA"
              onChange={e => onChangeSolarMake && onChangeSolarMake(e.target.value)}
              onBlur={e => onCommitSolarMake && onCommitSolarMake(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={solarSource}
              placeholder="NA"
              onChange={e => onChangeSolarSource && onChangeSolarSource(e.target.value)}
              onBlur={e => onCommitSolarSource && onCommitSolarSource(e.target.value)}
              style={inputStyle}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
