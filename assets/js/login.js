/* 登录 / 注册（本地模拟，不涉及真实鉴权） */
(function (NS) {
  'use strict';

  const S = NS.S;
  const UI = NS.UI;
  const P = (NS.Pages = NS.Pages || {});

  function after(nickname, mobile) {
    S.User.save({
      nickname,
      mobile: mobile.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2'),
      avatarText: nickname.slice(0, 1)
    });
    UI.toast('欢迎回来，' + nickname, 'success');
    const back = new URLSearchParams(location.search).get('redirect');
    setTimeout(() => (location.href = back || 'user.html'), 700);
  }

  P.login = {
    doLogin() {
      const m = document.getElementById('lgMobile').value.trim();
      const p = document.getElementById('lgPwd').value.trim();
      if (!/^1\d{10}$/.test(m)) return UI.toast('请输入 11 位手机号', 'error');
      if (!p) return UI.toast('请输入密码', 'error');
      after('云上小夏', m);
    },
    doReg() {
      const n = document.getElementById('rgName').value.trim();
      const m = document.getElementById('rgMobile').value.trim();
      const c = document.getElementById('rgCode').value.trim();
      if (!n) return UI.toast('请输入昵称', 'error');
      if (!/^1\d{10}$/.test(m)) return UI.toast('请输入 11 位手机号', 'error');
      if (!c) return UI.toast('请输入验证码', 'error');
      after(n, m);
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab[data-t]').forEach((t) => {
      t.onclick = () => {
        document.querySelectorAll('.tab[data-t]').forEach((x) => x.classList.remove('active'));
        t.classList.add('active');
        document.getElementById('paneLogin').classList.toggle('hide', t.dataset.t !== 'login');
        document.getElementById('paneReg').classList.toggle('hide', t.dataset.t !== 'reg');
      };
    });
  });
})(window.AIECP = window.AIECP || {});
