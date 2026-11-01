import React from "react";
import { createRoot } from "react-dom/client";
import CommuteApp from "../components/commute-app";
import "../app/globals.css";
import "../app/explorer.css";

createRoot(document.getElementById("root")!).render(<React.StrictMode><CommuteApp /></React.StrictMode>);
