import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  accessToken: localStorage.getItem("examedge_access") || "",
  refreshToken: localStorage.getItem("examedge_refresh") || ""
};

const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(state, action) {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user || null;
      if (accessToken) {
        state.accessToken = accessToken;
        localStorage.setItem("examedge_access", accessToken);
      }
      if (refreshToken) {
        state.refreshToken = refreshToken;
        localStorage.setItem("examedge_refresh", refreshToken);
      }
    },
    clearSession(state) {
      state.user = null;
      state.accessToken = "";
      state.refreshToken = "";
      localStorage.removeItem("examedge_access");
      localStorage.removeItem("examedge_refresh");
    }
  }
});

export const { setSession, clearSession } = slice.actions;
export const authReducer = slice.reducer;

