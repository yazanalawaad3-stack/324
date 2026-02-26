(function () {
  const sb = window.LUX && window.LUX.sb;
  const sess = window.LUX && window.LUX.session;
  if (!sb || !sess) return;

  const uid = sess.requireAuth("./login.html");
  if (!uid) return;

  const pct = { 1: 20, 2: 4, 3: 2, 4: 1 };

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function getChildren(parentIds) {
    if (!parentIds.length) return [];
    const res = await sb.from("users").select("id,referred_by").in("referred_by", parentIds);
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function load() {
    try {
      const gen1 = await getChildren([uid]);
      const gen1Ids = gen1.map((x) => x.id);

      const gen2 = await getChildren(gen1Ids);
      const gen2Ids = gen2.map((x) => x.id);

      const gen3 = await getChildren(gen2Ids);
      const gen3Ids = gen3.map((x) => x.id);

      const gen4 = await getChildren(gen3Ids);
      const gen4Ids = gen4.map((x) => x.id);

      const gens = { 1: gen1Ids, 2: gen2Ids, 3: gen3Ids, 4: gen4Ids };

      const all = gen1Ids.concat(gen2Ids, gen3Ids, gen4Ids);
      const balances = {};
      const deposited = new Set();

      if (all.length) {
        const wa = await sb.from("wallet_accounts").select("user_id,balance").in("user_id", all);
        if (wa.error) throw wa.error;
        (wa.data || []).forEach((r) => (balances[r.user_id] = Number(r.balance || 0)));

        const dep = await sb.from("real_deposits").select("user_id").in("user_id", all).eq("status", "credited");
        if (dep.error) throw dep.error;
        (dep.data || []).forEach((r) => deposited.add(r.user_id));
      }

      let sumActive = 0;
      let sumInactive = 0;

      [1, 2, 3, 4].forEach((depth) => {
        const ids = gens[depth];
        const registered = ids.length;
        let valid = 0;
        ids.forEach((id) => {
          const bal = balances[id] || 0;
          if (bal >= 100 && deposited.has(id)) valid += 1;
        });

        sumActive += valid;
        sumInactive += registered - valid;

        setText("g" + depth + "_registered", registered);
        setText("g" + depth + "_valid", valid);
        setText("g" + depth + "_pct", pct[depth].toFixed(2) + "%");
      });

      setText("sumActive", sumActive);
      setText("sumInactive", sumInactive);

      const today = new Date().toISOString().slice(0, 10);
      let totalIncome = 0;

      for (const depth of [1, 2, 3, 4]) {
        const res = await sb
          .from("network_commissions")
          .select("commission_amount")
          .eq("target_user_id", uid)
          .eq("level_depth", depth)
          .eq("business_day", today);

        if (res.error) throw res.error;
        const income = (res.data || []).reduce((a, r) => a + Number(r.commission_amount || 0), 0);
        totalIncome += income;
        setText("g" + depth + "_income", fmt(income));
      }

      setText("sumIncome", fmt(totalIncome));
    } catch (err) {
      sess.toast((err && err.message) || "Load error");
    }
  }

  window.addEventListener("load", load);
})();
