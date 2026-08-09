import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import "katex/dist/katex.min.css";
import "./utils/styles.css";
import { store } from "./store/store.js";
import { router } from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <>
        <RouterProvider router={router} />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4500,
            style: { borderRadius: "12px", fontSize: "14px" }
          }}
        />
      </>
    </Provider>
  </React.StrictMode>
);

