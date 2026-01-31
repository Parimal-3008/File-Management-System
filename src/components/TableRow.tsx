const TableRow = ({ user }) => {
  return (
    <div
      style={{
        padding: "0.5rem",
        height: `40px`,
        borderBottom: `1px solid var(--border)`,
      }}
    >
      <p>
        <strong>{user.name}</strong>
      </p>
      <div>{user.description}</div>
    </div>
  );
};

export default TableRow;
