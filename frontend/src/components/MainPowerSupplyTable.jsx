import React from "react";

export default function MainPowerSupplyTable({
  subCapacity = "",
  subMake = "",
  subSource = "",
  transCapacity = "",
  transMake = "",
  transSource = "",
  solarCapacity = "",
  solarMake = "",
  solarSource = "",
  onChangeSubCapacity,
  onChangeSubMake,
  onChangeSubSource,
  onChangeTransCapacity,
  onChangeTransMake,
  onChangeTransSource,
  onChangeSolarCapacity,
  onChangeSolarMake,
  onChangeSolarSource,
  onCommitSubCapacity,
  onCommitSubMake,
  onCommitSubSource,
  onCommitTransCapacity,
  onCommitTransMake,
  onCommitTransSource,
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

  // removed colored header

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
          <td style={labelCell}>Substation</td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={subCapacity}
              placeholder="NA"
              onChange={e => onChangeSubCapacity && onChangeSubCapacity(e.target.value)}
              onBlur={e => onCommitSubCapacity && onCommitSubCapacity(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={subMake}
              placeholder="NA"
              onChange={e => onChangeSubMake && onChangeSubMake(e.target.value)}
              onBlur={e => onCommitSubMake && onCommitSubMake(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={subSource}
              placeholder="NA"
              onChange={e => onChangeSubSource && onChangeSubSource(e.target.value)}
              onBlur={e => onCommitSubSource && onCommitSubSource(e.target.value)}
              style={inputStyle}
            />
          </td>
        </tr>
        <tr>
          <td style={labelBandCell}>(b)</td>
          <td style={labelCell}>Transformer</td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={transCapacity}
              placeholder="NA"
              onChange={e => onChangeTransCapacity && onChangeTransCapacity(e.target.value)}
              onBlur={e => onCommitTransCapacity && onCommitTransCapacity(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={transMake}
              placeholder="NA"
              onChange={e => onChangeTransMake && onChangeTransMake(e.target.value)}
              onBlur={e => onCommitTransMake && onCommitTransMake(e.target.value)}
              style={inputStyle}
            />
          </td>
          <td style={valueCell}>
            <input
              type="text"
              defaultValue={transSource}
              placeholder="NA"
              onChange={e => onChangeTransSource && onChangeTransSource(e.target.value)}
              onBlur={e => onCommitTransSource && onCommitTransSource(e.target.value)}
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
