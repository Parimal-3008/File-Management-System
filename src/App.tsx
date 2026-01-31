import "./App.css";
import { Routes, Route } from "react-router-dom";
import Table from "./Table";
import { useEffect } from "react";
import { initDB } from "./db/indexDb";

function App() {
  useEffect(() => {
    // Initialize IndexedDB when app loads
    initDB()
      .then((db) => {
        console.log("DB ready to use:", db);
      })
      .catch((err) => {
        console.error("DB initialization failed:", err);
      });
  }, []);
  return (
    <div className="App">
      <header>
        {/* <nav className="nav">
          <Link to="/">Home</Link>
          <span> | </span>
          <Link to="/files">Files</Link>
        </nav> */}
      </header>
      <main>
        <Routes>
          {/* <Route path="/" element={<Home />} /> */}
          <Route path="/" element={<Table />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
