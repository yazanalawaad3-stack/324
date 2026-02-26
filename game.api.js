(function () {
  "use strict";

  window.LUX = window.LUX || {};

  function getClient() {
    return window.LUX && window.LUX.sb ? window.LUX.sb : null;
  }

  function getUserId() {
    return window.LUX && window.LUX.session ? window.LUX.session.getUserId() : "";
  }

  async function rpc(name, params) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase client not found");
    const { data, error } = await sb.rpc(name, params || {});
    if (error) throw error;
    return data;
  }

  window.LUX.gameApi = { getClient, getUserId, rpc };
})();
