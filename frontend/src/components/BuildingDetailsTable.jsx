import React from "react";

export default function BuildingDetailsTable({
  building1Name = "",
  building1Height = "",
  building2Name = "",
  building2Height = "",
  noOfFloors = "",
  onChangeB1Name,
  onChangeB1Height,
  onChangeB2Name,
  onChangeB2Height,
  onChangeNoOfFloors,
  onCommitB1Name,
  onCommitB1Height,
  onCommitB2Name,
  onCommitB2Height,
  onCommitNoOfFloors,
  floorB1Height = "",
  floorB2Name = "",
  floorB2Height = "",
  onChangeFloorB1Height,
  onChangeFloorB2Name,
  onChangeFloorB2Height,
  onCommitFloorB1Height,
  onCommitFloorB2Name,
  onCommitFloorB2Height
}) {
  const baseCell = {
    border: "1px solid #000",
    padding: "12px 10px",
    fontSize: "14px",
    verticalAlign: "middle",
  };

  const headerCell = {
    ...baseCell,
    fontWeight: "700",
    textAlign: "center",
  };

  const labelCell = {
    ...baseCell,
    fontWeight: "600",
    textAlign: "left",
    width: "28%",
  };

  const valueCell = {
    ...baseCell,
    textAlign: "center",
    width: "18%",
  };

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        tableLayout: "fixed",
        marginTop: "12px",
      }}
    >
      <thead>
        <tr>
          <th style={headerCell}></th>
          <th style={headerCell}>Building Name</th>
          <th style={headerCell}>Building height (m)</th>
          <th style={headerCell}>Building Name</th>
          <th style={headerCell}>Building height (m)</th>
        </tr>
      </thead>

      <tbody>
        <tr>
          <td style={labelCell}>No of Building and Details</td>
          <td style={valueCell}>
            <input 
              type="text" 
              defaultValue={building1Name} 
              placeholder="NA" 
              onChange={e => onChangeB1Name && onChangeB1Name(e.target.value)}
              onBlur={e => onCommitB1Name && onCommitB1Name(e.target.value)}
              style={{ width: '100%', border: '1px solid #000', padding: '6px' }}
            />
          </td>
          <td style={valueCell}>
            <input 
              type="text" 
              defaultValue={building1Height} 
              placeholder="NA" 
              onChange={e => onChangeB1Height && onChangeB1Height(e.target.value)}
              onBlur={e => onCommitB1Height && onCommitB1Height(e.target.value)}
              style={{ width: '100%', border: '1px solid #000', padding: '6px' }}
            />
          </td>
          <td style={valueCell}>
            <input 
              type="text" 
              defaultValue={building2Name} 
              placeholder="NA" 
              onChange={e => onChangeB2Name && onChangeB2Name(e.target.value)}
              onBlur={e => onCommitB2Name && onCommitB2Name(e.target.value)}
              style={{ width: '100%', border: '1px solid #000', padding: '6px' }}
            />
          </td>
          <td style={valueCell}>
            <input 
              type="text" 
              defaultValue={building2Height} 
              placeholder="NA" 
              onChange={e => onChangeB2Height && onChangeB2Height(e.target.value)}
              onBlur={e => onCommitB2Height && onCommitB2Height(e.target.value)}
              style={{ width: '100%', border: '1px solid #000', padding: '6px' }}
            />
          </td>
        </tr>

        <tr>
          <td style={labelCell}>No of Floors</td>
          <td style={valueCell}>
            <input 
              type="text" 
              defaultValue={noOfFloors} 
              placeholder="NA" 
              onChange={e => onChangeNoOfFloors && onChangeNoOfFloors(e.target.value)}
              onBlur={e => onCommitNoOfFloors && onCommitNoOfFloors(e.target.value)}
              style={{ width: '100%', border: '1px solid #000', padding: '6px' }}
            />
          </td>
          <td style={valueCell}>
            <input 
              type="text" 
              defaultValue={floorB1Height} 
              placeholder="NA" 
              onChange={e => onChangeFloorB1Height && onChangeFloorB1Height(e.target.value)}
              onBlur={e => onCommitFloorB1Height && onCommitFloorB1Height(e.target.value)}
              style={{ width: '100%', border: '1px solid #000', padding: '6px' }}
            />
          </td>
          <td style={valueCell}>
            <input 
              type="text" 
              defaultValue={floorB2Name} 
              placeholder="NA" 
              onChange={e => onChangeFloorB2Name && onChangeFloorB2Name(e.target.value)}
              onBlur={e => onCommitFloorB2Name && onCommitFloorB2Name(e.target.value)}
              style={{ width: '100%', border: '1px solid #000', padding: '6px' }}
            />
          </td>
          <td style={valueCell}>
            <input 
              type="text" 
              defaultValue={floorB2Height} 
              placeholder="NA" 
              onChange={e => onChangeFloorB2Height && onChangeFloorB2Height(e.target.value)}
              onBlur={e => onCommitFloorB2Height && onCommitFloorB2Height(e.target.value)}
              style={{ width: '100%', border: '1px solid #000', padding: '6px' }}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
