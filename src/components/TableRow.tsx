const TableRow = ({ row }) => {
  return (
    <div
      style={{
        padding: "0.5rem",
        height: `40px`,
        borderBottom: `1px solid var(--border)`,
      }}
    >
      <p>
        <strong>{row.name}</strong>
      </p>
      <div>{row.description}</div>
    </div>
  );
};

export default TableRow;
