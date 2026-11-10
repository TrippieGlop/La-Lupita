(function () {
  "use strict";
  document.documentElement.classList.add("js");

  /* Mobile nav */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* Open / closed status, based on Bethlehem time */
  // [open, close] in minutes after midnight. 0 = Sunday.
  var HOURS = {
    0: [660, 1200], 1: [660, 1200], 2: [660, 1200], 3: [660, 1200],
    4: [660, 1200], 5: [660, 1260], 6: [660, 1260]
  };

  function bethlehemNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "numeric", hour12: false
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (p) { map[p.type] = p.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      var h = parseInt(map.hour, 10) % 24;
      return { day: days[map.weekday], mins: h * 60 + parseInt(map.minute, 10) };
    } catch (err) {
      var d = new Date();
      return { day: d.getDay(), mins: d.getHours() * 60 + d.getMinutes() };
    }
  }
  function fmt(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    var suffix = h >= 12 ? "pm" : "am";
    var hh = h % 12 === 0 ? 12 : h % 12;
    return hh + (m ? ":" + (m < 10 ? "0" : "") + m : "") + " " + suffix;
  }
  var now = bethlehemNow();
  var today = HOURS[now.day];
  var isOpen = now.mins >= today[0] && now.mins < today[1];
  var message;
  if (isOpen) {
    var left = today[1] - now.mins;
    message = left <= 45 ? "Open now, closing soon at " + fmt(today[1]) : "Open now until " + fmt(today[1]);
  } else if (now.mins < today[0]) {
    message = "Closed now, opens today at " + fmt(today[0]);
  } else {
    var next = HOURS[(now.day + 1) % 7];
    message = "Closed now, opens tomorrow at " + fmt(next[0]);
  }
  document.querySelectorAll("[data-status]").forEach(function (el) {
    el.classList.add(isOpen ? "is-open" : "is-closed");
    var label = el.querySelector("[data-status-text]");
    if (label) label.textContent = message;
    el.hidden = false;
  });
  document.querySelectorAll(".hours tr[data-day]").forEach(function (row) {
    if (parseInt(row.getAttribute("data-day"), 10) === now.day) {
      row.classList.add("today");
      row.setAttribute("aria-current", "date");
    }
  });

  /* Click to load map, so Google is only contacted if the visitor asks */
  var mapBtn = document.querySelector("[data-load-map]");
  if (mapBtn) {
    mapBtn.addEventListener("click", function () {
      var shell = mapBtn.closest(".map-shell");
      var frame = document.createElement("iframe");
      frame.src = "https://www.google.com/maps?q=La+Lupita,+4+W+4th+St,+Bethlehem,+PA+18015&output=embed";
      frame.title = "Map showing La Lupita at 4 W 4th St, Bethlehem, PA";
      frame.loading = "lazy";
      frame.referrerPolicy = "no-referrer-when-downgrade";
      frame.setAttribute("allowfullscreen", "");
      shell.innerHTML = "";
      shell.appendChild(frame);
      frame.focus();
    });
  }

  /* Reveal on scroll */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* Menu: search filter + active category chip */
  var search = document.getElementById("menu-search");
  var sections = Array.prototype.slice.call(document.querySelectorAll(".menu-section"));
  var empty = document.querySelector(".menu-empty");
  if (search && sections.length) {
    var normalize = function (s) {
      return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    };
    search.addEventListener("input", function () {
      var q = normalize(search.value.trim());
      var shown = 0;
      sections.forEach(function (sec) {
        var any = false;
        sec.querySelectorAll(".menu-item").forEach(function (item) {
          var match = !q || normalize(item.textContent).indexOf(q) !== -1;
          item.hidden = !match;
          if (match) { any = true; shown++; }
        });
        sec.hidden = !any;
      });
      if (empty) empty.classList.toggle("show", shown === 0);
      var status = document.getElementById("menu-search-status");
      if (status) status.textContent = q ? shown + (shown === 1 ? " dish found" : " dishes found") : "";
    });
  }

  var chips = document.querySelectorAll(".chips a");
  if (chips.length && "IntersectionObserver" in window) {
    var chipFor = {};
    chips.forEach(function (c) { chipFor[c.getAttribute("href").slice(1)] = c; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          chips.forEach(function (c) { c.classList.remove("active"); c.removeAttribute("aria-current"); });
          var chip = chipFor[entry.target.id];
          if (chip) {
            chip.classList.add("active");
            chip.setAttribute("aria-current", "true");
            var bar = chip.parentElement;
            var target = chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2;
            bar.scrollTo({ left: target, behavior: "smooth" });
          }
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* Footer year */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

})();
