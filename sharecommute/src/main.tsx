import React from "react";
import { createRoot } from "react-dom/client";
import CommuteApp from "../components/commute-app";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(<React.StrictMode><CommuteApp /></React.StrictMode>);
