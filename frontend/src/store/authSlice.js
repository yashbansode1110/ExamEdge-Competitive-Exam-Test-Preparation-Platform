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
      if (user) {
        state.user = { ...(state.user || {}), ...user };
        if (state.user._id && !state.user.id) state.user.id = String(state.user._id);
        if (state.user.id && !state.user._id) state.user._id = state.user.id;
      } else if (user === null) {
        state.user = null;
      }
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
    },
    updatePaymentState(state, action) {
      if (state.user) {
        const { isPremium, purchasedTests, testsAttempted } = action.payload;
        if (isPremium !== undefined) {
          state.user.isPremium = isPremium;
        }
        if (purchasedTests !== undefined) {
          state.user.purchasedTests = purchasedTests;
        }
        if (testsAttempted !== undefined) {
          state.user.testsAttempted = testsAttempted;
        }
      }
    }
  }
});

export const { setSession, clearSession, updatePaymentState } = slice.actions;
export const authReducer = slice.reducer;

