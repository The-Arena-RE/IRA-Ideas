(async function () {
  "use strict";
  const CONFIG = {
    verificationWebhook: "/api/pss/verification",
    bookingWebhook: "/api/pss/booking",
    stripePublishableKey: "",
    returnUrl: "",
    showInternalHeader: true,
    showInternalFooter: true,
    useDataLayer: false,
    maxMonthsAhead: 6,
    maxFiles: 5,
    maxFileBytes: 5 * 1024 * 1024,
    maxTotalFileBytes: 12 * 1024 * 1024
  };
  const root = document.getElementById("ira-pss");
  if (!root || root.dataset.pssInitialized) return;
  root.dataset.pssInitialized = "true";
  let publicConfig = { membershipConfigured: false, bookingConfigured: false };
  try {
    const configResponse = await fetch("/api/pss/config", { cache: "no-store", credentials: "same-origin" });
    if (configResponse.ok) {
      publicConfig = await configResponse.json();
      if (typeof publicConfig.stripePublishableKey === "string") {
        CONFIG.stripePublishableKey = publicConfig.stripePublishableKey;
      }
    }
  } catch (_) {}

  const $ = function (selector) { return root.querySelector(selector); };
  const $$ = function (selector) { return Array.from(root.querySelectorAll(selector)); };
  const money = function (amount) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount); };
  const motion = function () { return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"; };
  const state = {
    verification: null, verifyVersion: 0, verifyAbort: null,
    calendarVersion: 0, calendarAbort: null, slots: [], selectedDate: null, selectedSlot: null,
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", month: null,
    creating: false, booking: null, submissionKey: null, submissionSignature: null,
    stripe: null, elements: null, paymentElement: null, stripeLoading: null,
    pollVersion: 0, paying: false, trackIntake: false
  };
  $(".pss-header").hidden = !CONFIG.showInternalHeader;
  $(".pss-footer").hidden = !CONFIG.showInternalFooter;
  function message(selector, text, tone) {
    const node = $(selector);
    node.textContent = text || "";
    node.dataset.tone = tone || "normal";
  }

  if (!publicConfig.membershipConfigured || !publicConfig.bookingConfigured || !CONFIG.stripePublishableKey) {
    message(
      "#pss-verification-status",
      "Online booking is being configured on this preview. Membership verification and payment will be enabled after the production integrations are connected.",
      "normal"
    );
  }
  function track(event, properties) {
    const detail = Object.assign({ event: "ira_pss_" + event, brand: "IRA Ideas", session_type: "Private Strategy Session" }, properties || {});
    root.dispatchEvent(new CustomEvent("ira_pss:event", { bubbles: true, detail: detail }));
    if (CONFIG.useDataLayer && Array.isArray(window.dataLayer)) window.dataLayer.push(detail);
  }
  function progress(step) {
    $$("[data-progress]").forEach(function (item) {
      const value = Number(item.dataset.progress);
      item.classList.toggle("is-current", value === step);
      item.classList.toggle("is-done", value < step);
      if (value === step) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
  }
  function goTo(node, focusNode) {
    node.scrollIntoView({ behavior: motion(), block: "start" });
    if (focusNode) {
      try { focusNode.focus({ preventScroll: true }); } catch (_) { focusNode.focus(); }
    }
  }
  const attributionKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "referrer_host", "landing_path"];
  function captureAttribution() {
    const result = {};
    try {
      const stored = JSON.parse(sessionStorage.getItem("ira_pss_source") || "null");
      if (stored && typeof stored === "object") attributionKeys.forEach(function (key) {
        if (typeof stored[key] === "string") result[key] = stored[key].slice(0, 200);
      });
    } catch (_) {}
    if (!Object.keys(result).length) {
      const params = new URLSearchParams(window.location.search);
      attributionKeys.slice(0, 5).forEach(function (key) { if (params.has(key)) result[key] = params.get(key).slice(0, 200); });
      try { if (document.referrer) result.referrer_host = new URL(document.referrer).hostname; } catch (_) {}
      result.landing_path = window.location.pathname;
      try { sessionStorage.setItem("ira_pss_source", JSON.stringify(result)); } catch (_) {}
    }
    return result;
  }
  const attribution = captureAttribution();
  function uuid() {
    if (window.crypto.randomUUID) return window.crypto.randomUUID();
    const bytes = window.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
  }
  function configured(url) {
    if (!url || url.indexOf("<") !== -1) return false;
    try {
      const parsed = new URL(url, window.location.href);
      return parsed.protocol === "https:" || (parsed.origin === window.location.origin && /^(localhost|127\.0\.0\.1)$/.test(parsed.hostname));
    } catch (_) { return false; }
  }
  async function request(url, payload, options) {
    const settings = options || {};
    if (!configured(url)) throw new Error("unconfigured");
    const controller = new AbortController();
    const forwardAbort = function () { controller.abort(); };
    if (settings.signal) {
      if (settings.signal.aborted) controller.abort();
      else settings.signal.addEventListener("abort", forwardAbort, { once: true });
    }
    const timer = setTimeout(function () { controller.abort(); }, settings.timeout || 20000);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: settings.multipart ? {} : { "Content-Type": "application/json" },
        body: settings.multipart ? payload : JSON.stringify(payload),
        cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer",
        signal: controller.signal
      });
      let data;
      try { data = await response.json(); } catch (_) { throw new Error("invalid_response"); }
      if (Array.isArray(data) && data.length === 1) data = data[0];
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("invalid_response");
      if (!response.ok) {
        const error = new Error("request_failed");
        error.httpStatus = response.status;
        error.data = data;
        throw error;
      }
      return data;
    } finally {
      clearTimeout(timer);
      if (settings.signal) settings.signal.removeEventListener("abort", forwardAbort);
    }
  }
  function parseVerification(data, email) {
    if (typeof data.member !== "boolean" || data.currency && data.currency !== "USD") throw new Error("invalid_response");
    if (data.member && data.status !== "active" || !data.member && data.status !== "inactive") throw new Error("invalid_response");
    if (typeof data.price !== "number" || data.price !== (data.member ? 1000 : 1500)) throw new Error("invalid_response");
    if (typeof data.verification_id !== "string" || !data.verification_id.trim() || data.verification_id.length > 512) throw new Error("invalid_response");
    const expiry = data.expires_at ? Date.parse(data.expires_at) : Date.now() + 30 * 60 * 1000;
    if (!Number.isFinite(expiry) || expiry <= Date.now()) throw new Error("expired_verification");
    return { member: data.member, price: data.price, id: data.verification_id, email: email, expires: expiry };
  }
  function applyVerification(value) {
    state.verification = value;
    const label = value.member ? "Tax Academy Member Rate" : "Standard Booking";
    $("[data-verified-label]").textContent = label;
    $("[data-verified-price]").textContent = money(value.price);
    $("[data-summary-price]").textContent = money(value.price);
    $("[data-summary-caption]").textContent = label;
    $("[data-continue-intake]").firstChild.textContent = value.member ? "Continue Booking " : "Book Strategy Session ";
    $("[data-verified-result]").hidden = false;
    $("#pss-intake").hidden = false;
    $("#pss-booking-email").value = value.email;
    progress(2);
  }
  function destroyPayment() {
    state.pollVersion++;
    if (state.paymentElement) { try { state.paymentElement.destroy(); } catch (_) {} }
    state.paymentElement = null;
    state.elements = null;
    $("#pss-payment-element").replaceChildren();
  }
  function invalidateVerification() {
    state.verifyVersion++;
    state.calendarVersion++;
    if (state.verifyAbort) state.verifyAbort.abort();
    if (state.calendarAbort) state.calendarAbort.abort();
    state.verification = null;
    state.selectedSlot = null;
    state.selectedDate = null;
    state.slots = [];
    state.submissionKey = null;
    state.submissionSignature = null;
    state.trackIntake = false;
    destroyPayment();
    ["[data-verified-result]", "#pss-intake", "#pss-calendar", "#pss-payment", "#pss-confirmation"].forEach(function (selector) { $(selector).hidden = true; });
    $("#pss-booking-email").value = "";
    $("[data-summary-price]").textContent = "Your rate";
    $("[data-summary-caption]").textContent = "Check your email to see your applicable booking price.";
    $("[data-verify-button]").disabled = false;
    $("[data-verify-button]").firstChild.textContent = "Verify Membership ";
    $("#pss-verification-form").removeAttribute("aria-busy");
    progress(1);
  }
  function hasVerification() {
    if (state.verification && state.verification.expires > Date.now() && state.verification.email === $("#pss-check-email").value.trim().toLowerCase()) return true;
    invalidateVerification();
    message("#pss-verification-status", "Please check your email again before continuing.", "error");
    goTo($("#pss-verification-form"), $("#pss-check-email"));
    return false;
  }
  $("#pss-check-email").addEventListener("input", function () {
    if (!state.booking) {
      invalidateVerification();
      message("#pss-verification-status", "");
    }
  });
  $("#pss-verification-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    if (state.booking) return;
    const form = event.currentTarget;
    const input = $("#pss-check-email");
    input.value = input.value.trim();
    if (!form.reportValidity()) return;
    const email = input.value.toLowerCase();
    invalidateVerification();
    const version = state.verifyVersion;
    const abort = new AbortController();
    state.verifyAbort = abort;
    $("[data-verify-button]").disabled = true;
    $("[data-verify-button]").firstChild.textContent = "Checking… ";
    form.setAttribute("aria-busy", "true");
    message("#pss-verification-status", "Checking membership…");
    track("membership_verification_started");
    try {
      const data = await request(CONFIG.verificationWebhook, { action: "verify_membership", email: email }, { signal: abort.signal });
      if (version !== state.verifyVersion || input.value.trim().toLowerCase() !== email) return;
      const value = parseVerification(data, email);
      applyVerification(value);
      message("#pss-verification-status", value.member ? "Active Tax Academy membership found for this email." : "Your standard booking rate is ready.", "success");
      track("membership_verification_completed");
      track(value.member ? "active_member_verified" : "non_member_result_received");
    } catch (error) {
      if (version !== state.verifyVersion) return;
      message("#pss-verification-status", error.httpStatus === 400 ? "Please enter a valid email address and try again." : "We could not check membership right now. Please try again.", "error");
      track("membership_verification_failed");
    } finally {
      if (version === state.verifyVersion) {
        $("[data-verify-button]").disabled = false;
        $("[data-verify-button]").firstChild.textContent = "Verify Membership ";
        form.removeAttribute("aria-busy");
      }
    }
  });
  $("[data-continue-intake]").addEventListener("click", function () {
    if (hasVerification()) goTo($("#pss-intake"), $("#pss-first-name"));
  });
  $("[data-change-email]").addEventListener("click", function () {
    if (state.booking) return;
    invalidateVerification();
    message("#pss-verification-status", "Enter your booking email and check your rate again.");
    goTo($("#pss-verification-form"), $("#pss-check-email"));
  });
  $$("[data-pss-verify]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      if (link.dataset.track) track(link.dataset.track);
      goTo($("#pss-booking"), state.booking ? null : $("#pss-check-email"));
    });
  });
  function validFiles() {
    const input = $("#pss-documents");
    const files = Array.from(input.files || []);
    const allowed = /\.(pdf|doc|docx|jpg|jpeg|png)$/i;
    let text = "";
    if (files.length > CONFIG.maxFiles) text = "Please select no more than 5 files.";
    else if (files.some(function (file) { return !allowed.test(file.name); })) text = "Please use PDF, DOC, DOCX, JPG, JPEG, or PNG files.";
    else if (files.some(function (file) { return file.size > CONFIG.maxFileBytes; })) text = "Each file must be 5 MB or smaller.";
    else if (files.reduce(function (sum, file) { return sum + file.size; }, 0) > CONFIG.maxTotalFileBytes) text = "Please keep the total file size to 12 MB or less.";
    input.setCustomValidity(text);
    message("#pss-file-status", text, text ? "error" : "normal");
    return !text;
  }
  function renderFiles() {
    const files = Array.from($("#pss-documents").files || []);
    const list = $("[data-file-list]");
    list.replaceChildren();
    files.forEach(function (file) {
      const item = document.createElement("li");
      const name = document.createElement("span");
      const size = document.createElement("span");
      name.textContent = file.name;
      size.textContent = (file.size / (1024 * 1024)).toFixed(1) + " MB";
      item.append(name, size);
      list.append(item);
    });
    $("[data-clear-files]").hidden = !files.length;
    validFiles();
  }
  $("#pss-documents").addEventListener("change", renderFiles);
  $("[data-clear-files]").addEventListener("click", function () { $("#pss-documents").value = ""; renderFiles(); });
  function validIntake() {
    ["pss-first-name", "pss-last-name", "pss-phone", "pss-primary-question"].forEach(function (id) {
      const input = $("#" + id);
      input.setCustomValidity(input.value.trim() ? "" : "Please complete this field.");
    });
    validFiles();
    return $("#pss-intake-form").reportValidity();
  }
  $("#pss-intake-form").addEventListener("input", function (event) {
    if (event.target.setCustomValidity && event.target.id !== "pss-documents") event.target.setCustomValidity("");
    if (!state.trackIntake && state.verification) { state.trackIntake = true; track("intake_started"); }
  });
  function dateKey(value, zone) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
    const get = function (type) { return parts.find(function (part) { return part.type === type; }).value; };
    return get("year") + "-" + get("month") + "-" + get("day");
  }
  function monthKey(date) { return dateKey(date, state.zone).slice(0, 7); }
  function monthIndex(value) { const pieces = value.split("-").map(Number); return pieces[0] * 12 + pieces[1] - 1; }
  function indexMonth(value) { return Math.floor(value / 12) + "-" + String(value % 12 + 1).padStart(2, "0"); }
  function validTimestamp(value) { return typeof value === "string" && /(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)); }
  function formatAppointment(value) {
    return new Intl.DateTimeFormat("en-US", { timeZone: state.zone, weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));
  }
  const zones = Array.from(new Set([state.zone, "America/Chicago", "America/New_York", "America/Denver", "America/Los_Angeles", "Europe/London", "Asia/Manila", "Asia/Shanghai", "UTC"]));
  zones.forEach(function (zone) {
    const option = document.createElement("option");
    option.value = zone;
    option.textContent = zone.replace(/_/g, " ");
    $("#pss-time-zone").append(option);
  });
  $("#pss-time-zone").value = state.zone;
  state.month = monthKey(Date.now());
  function dateLabel(value) {
    return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(value + "T12:00:00Z"));
  }
  function renderSlots() {
    const container = $("[data-time-slots]");
    container.replaceChildren();
    $("[data-slot-heading]").textContent = state.selectedDate ? "Available times for " + dateLabel(state.selectedDate) : "";
    state.slots.filter(function (slot) { return dateKey(slot.start, state.zone) === state.selectedDate; }).forEach(function (slot) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pss-slot";
      button.textContent = new Intl.DateTimeFormat("en-US", { timeZone: state.zone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(slot.start));
      const selected = !!state.selectedSlot && state.selectedSlot.id === slot.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.addEventListener("click", function () {
        if (state.booking || state.creating) return;
        state.selectedSlot = slot;
        renderSlots();
        $("[data-calendar-selected]").textContent = formatAppointment(slot.start);
        $("[data-create-booking]").disabled = false;
        message("#pss-booking-status", "");
        track("time_selected");
      });
      container.append(button);
    });
  }
  function renderCalendar() {
    const pieces = state.month.split("-").map(Number);
    const first = new Date(Date.UTC(pieces[0], pieces[1] - 1, 1));
    const days = new Date(Date.UTC(pieces[0], pieces[1], 0)).getUTCDate();
    $("[data-month-label]").textContent = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(first);
    $("[data-month-prev]").disabled = monthIndex(state.month) <= monthIndex(monthKey(Date.now())) || !!state.booking;
    $("[data-month-next]").disabled = monthIndex(state.month) >= monthIndex(monthKey(Date.now())) + CONFIG.maxMonthsAhead || !!state.booking;
    const container = $("[data-calendar-days]");
    container.replaceChildren();
    for (let i = 0; i < first.getUTCDay(); i++) { const gap = document.createElement("span"); gap.className = "pss-empty-day"; container.append(gap); }
    const available = new Set(state.slots.map(function (slot) { return dateKey(slot.start, state.zone); }));
    for (let day = 1; day <= days; day++) {
      const key = state.month + "-" + String(day).padStart(2, "0");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pss-day";
      button.textContent = String(day);
      button.disabled = !available.has(key) || !!state.booking;
      button.classList.toggle("is-available", available.has(key));
      button.classList.toggle("is-selected", state.selectedDate === key);
      button.setAttribute("aria-label", dateLabel(key) + (available.has(key) ? ", appointments available" : ", no appointments available"));
      button.setAttribute("aria-pressed", String(state.selectedDate === key));
      button.addEventListener("click", function () {
        if (state.booking || state.creating) return;
        state.selectedDate = key;
        state.selectedSlot = null;
        $("[data-create-booking]").disabled = true;
        $("[data-calendar-selected]").textContent = "";
        renderCalendar();
        renderSlots();
      });
      container.append(button);
    }
  }
  async function loadAvailability() {
    if (!hasVerification() || state.booking) return;
    if (state.calendarAbort) state.calendarAbort.abort();
    const version = ++state.calendarVersion;
    const abort = new AbortController();
    state.calendarAbort = abort;
    state.selectedDate = null;
    state.selectedSlot = null;
    state.slots = [];
    $("[data-create-booking]").disabled = true;
    $("[data-calendar-selected]").textContent = "";
    $("[data-retry-calendar]").hidden = true;
    message("#pss-calendar-status", "Loading available appointments…");
    renderCalendar();
    renderSlots();
    try {
      const data = await request(CONFIG.verificationWebhook, { action: "get_availability", verification_id: state.verification.id, month: state.month, time_zone: state.zone }, { signal: abort.signal });
      if (version !== state.calendarVersion) return;
      if (!Array.isArray(data.slots)) throw new Error("invalid_response");
      const ids = new Set();
      state.slots = data.slots.filter(function (slot) {
        if (!slot || typeof slot.id !== "string" || !slot.id || ids.has(slot.id) || !validTimestamp(slot.start) || !validTimestamp(slot.end)) return false;
        if (Date.parse(slot.start) <= Date.now() || Date.parse(slot.end) <= Date.parse(slot.start) || dateKey(slot.start, state.zone).slice(0, 7) !== state.month) return false;
        ids.add(slot.id);
        return true;
      }).sort(function (a, b) { return Date.parse(a.start) - Date.parse(b.start); });
      state.selectedDate = state.slots.length ? dateKey(state.slots[0].start, state.zone) : null;
      renderCalendar();
      renderSlots();
      message("#pss-calendar-status", state.slots.length ? "Choose a date with availability, then select a time." : "No appointments are available this month. Please check another month.");
    } catch (error) {
      if (version !== state.calendarVersion) return;
      if (error.httpStatus === 401 || error.httpStatus === 410) { hasExpiredVerification(); return; }
      message("#pss-calendar-status", "We couldn't load available times. Please try again.", "error");
      $("[data-retry-calendar]").hidden = false;
    }
  }
  function hasExpiredVerification() {
    invalidateVerification();
    message("#pss-verification-status", "Your rate check has expired. Please verify your email again.", "error");
    goTo($("#pss-verification-form"), $("#pss-check-email"));
  }
  $("#pss-intake-form").addEventListener("submit", function (event) {
    event.preventDefault();
    if (state.booking || !hasVerification() || !validIntake()) return;
    $("#pss-calendar").hidden = false;
    progress(3);
    track("intake_completed");
    track("calendar_viewed");
    goTo($("#pss-calendar"));
    loadAvailability();
  });
  $("#pss-time-zone").addEventListener("change", function () {
    if (state.booking || state.creating) return;
    state.zone = this.value;
    state.month = monthKey(Date.now());
    loadAvailability();
  });
  $("[data-month-prev]").addEventListener("click", function () { if (!state.booking && !state.creating) { state.month = indexMonth(monthIndex(state.month) - 1); loadAvailability(); } });
  $("[data-month-next]").addEventListener("click", function () { if (!state.booking && !state.creating) { state.month = indexMonth(monthIndex(state.month) + 1); loadAvailability(); } });
  $("[data-retry-calendar]").addEventListener("click", loadAvailability);
  function lockBooking(locked) {
    $("#pss-check-email").disabled = locked;
    $("[data-verify-button]").disabled = locked;
    $("[data-continue-intake]").disabled = locked;
    $("[data-intake-fields]").disabled = locked;
    $("[data-intake-button]").disabled = locked;
    $("#pss-time-zone").disabled = locked;
    $("[data-month-prev]").disabled = locked;
    $("[data-month-next]").disabled = locked;
    $$(".pss-day,.pss-slot").forEach(function (button) { button.disabled = locked || !button.classList.contains("is-available") && button.classList.contains("pss-day"); });
    $("[data-create-booking]").disabled = locked || !state.selectedSlot;
    if (!locked) renderCalendar();
  }
  function bookingPayload() {
    const form = new FormData($("#pss-intake-form"));
    const files = Array.from($("#pss-documents").files || []);
    return {
      action: "create_booking",
      verification_id: state.verification.id,
      session_type: "Private Strategy Session",
      contact: {
        first_name: form.get("first_name").trim(),
        last_name: form.get("last_name").trim(),
        email: state.verification.email,
        phone: form.get("phone").trim()
      },
      account_type: form.get("account_type"),
      topics: form.getAll("topics"),
      primary_question: form.get("primary_question").trim(),
      background: form.get("background").trim(),
      slot_id: state.selectedSlot.id,
      appointment_start: state.selectedSlot.start,
      time_zone: state.zone,
      accepted_price: state.verification.price,
      currency: "USD",
      attribution: attribution,
      documents: files.map(function (file, index) {
        return { field: "documents_" + index, name: file.name, size: file.size, media_type: file.type };
      })
    };
  }
  function parseBooking(data) {
    if (typeof data.booking_id !== "string" || !data.booking_id || typeof data.booking_token !== "string" || !data.booking_token) throw new Error("invalid_response");
    if (data.currency !== "USD" || ![1000, 1500].includes(data.amount) || !validTimestamp(data.appointment_start)) throw new Error("invalid_response");
    if (!["payment_pending", "confirmed"].includes(data.status)) throw new Error("invalid_response");
    if (data.status === "payment_pending" && (typeof data.payment_client_secret !== "string" || !/^pi_[a-zA-Z0-9]+_secret_/.test(data.payment_client_secret))) throw new Error("invalid_response");
    return {
      id: data.booking_id, token: data.booking_token, amount: data.amount,
      start: data.appointment_start, secret: data.payment_client_secret || null,
      holdExpires: data.hold_expires_at || null
    };
  }
  function savePendingBooking() {
    if (!state.booking) return;
    try {
      sessionStorage.setItem("ira_pss_pending_booking", JSON.stringify({ id: state.booking.id, token: state.booking.token, saved_at: Date.now() }));
    } catch (_) {}
  }
  $("[data-create-booking]").addEventListener("click", async function () {
    if (state.creating || state.booking || !hasVerification() || !validIntake() || !state.selectedSlot) return;
    if (!/^pk_(test|live)_/.test(CONFIG.stripePublishableKey)) {
      message("#pss-booking-status", "Payment is temporarily unavailable. Please try again later.", "error");
      return;
    }
    const payload = bookingPayload();
    const files = Array.from($("#pss-documents").files || []);
    const signature = JSON.stringify(payload) + files.map(function (file) { return file.lastModified; }).join(",");
    if (signature !== state.submissionSignature) {
      state.submissionSignature = signature;
      state.submissionKey = uuid();
    }
    payload.idempotency_key = state.submissionKey;
    const body = new FormData();
    body.append("action", "create_booking");
    body.append("payload", JSON.stringify(payload));
    files.forEach(function (file, index) { body.append("documents_" + index, file, file.name); });
    state.creating = true;
    lockBooking(true);
    message("#pss-booking-status", "Preparing your booking and payment…");
    $("[data-create-booking]").firstChild.textContent = "Preparing… ";
    try {
      const data = await request(CONFIG.bookingWebhook, body, { multipart: true, timeout: 45000 });
      const booking = parseBooking(data);
      if (booking.amount !== payload.accepted_price) throw new Error("price_mismatch");
      state.booking = booking;
      savePendingBooking();
      track("booking_submission_accepted");
      message("#pss-booking-status", "Your selected time is temporarily reserved while you complete payment.", "success");
      progress(4);
      if (data.status === "confirmed") { finishBooking(data); return; }
      $("#pss-payment").hidden = false;
      $("[data-payment-price]").textContent = money(booking.amount);
      $("[data-payment-appointment]").textContent = formatAppointment(booking.start);
      goTo($("#pss-payment"));
      await mountPayment();
    } catch (error) {
      const data = error.data || {};
      if (data.code === "price_changed" && data.verification) {
        try {
          const value = parseVerification(data.verification, state.verification.email);
          applyVerification(value);
          progress(3);
          state.submissionSignature = null;
          message("#pss-booking-status", "Your current booking rate is " + money(value.price) + ". Review the rate, then continue to payment.", "error");
          $("[data-create-booking]").firstChild.textContent = "Continue at " + money(value.price) + " ";
        } catch (_) { hasExpiredVerification(); }
      } else if (data.code === "slot_unavailable") {
        message("#pss-booking-status", "That time is no longer available. Please select another appointment.", "error");
        state.selectedSlot = null;
        await loadAvailability();
      } else if (error.httpStatus === 401 || error.httpStatus === 410) {
        hasExpiredVerification();
      } else {
        message("#pss-booking-status", "We couldn't prepare your booking. Please try again. Your submission will not be duplicated.", "error");
      }
    } finally {
      state.creating = false;
      if (!state.booking) lockBooking(false);
      if (!state.booking && $("[data-create-booking]").firstChild.textContent === "Preparing… ") $("[data-create-booking]").firstChild.textContent = "Continue to Payment ";
    }
  });
  function loadStripe() {
    if (typeof window.Stripe === "function") return Promise.resolve();
    if (state.stripeLoading) return state.stripeLoading;
    state.stripeLoading = new Promise(function (resolve, reject) {
      let script = document.querySelector('script[src="https://js.stripe.com/v3/"]');
      if (!script) {
        script = document.createElement("script");
        script.src = "https://js.stripe.com/v3/";
        script.async = true;
        document.head.appendChild(script);
      }
      const timer = setTimeout(function () { reject(new Error("stripe_unavailable")); }, 20000);
      script.addEventListener("load", function () { clearTimeout(timer); if (typeof window.Stripe === "function") resolve(); else reject(new Error("stripe_unavailable")); }, { once: true });
      script.addEventListener("error", function () { clearTimeout(timer); reject(new Error("stripe_unavailable")); }, { once: true });
    }).catch(function (error) { state.stripeLoading = null; throw error; });
    return state.stripeLoading;
  }
  async function mountPayment() {
    if (!state.booking || !state.booking.secret) return;
    $("[data-pay-button]").disabled = true;
    $("[data-retry-payment]").hidden = true;
    message("#pss-payment-status", "Loading secure payment…");
    try {
      await loadStripe();
      if (state.paymentElement) { state.paymentElement.destroy(); state.paymentElement = null; }
      state.stripe = window.Stripe(CONFIG.stripePublishableKey);
      state.elements = state.stripe.elements({
        clientSecret: state.booking.secret,
        appearance: {
          theme: "night",
          variables: { colorPrimary: "#B89958", colorBackground: "#242529", colorText: "#F5F6F8", colorDanger: "#FFB9B9", borderRadius: "4px", fontFamily: "Poppins, Arial, sans-serif", fontSizeBase: "14px" }
        },
        fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" }]
      });
      state.paymentElement = state.elements.create("payment");
      state.paymentElement.on("ready", function () {
        $("[data-pay-button]").disabled = false;
        $("[data-pay-button]").firstChild.textContent = "Pay " + money(state.booking.amount) + " & Confirm Session ";
        message("#pss-payment-status", "Your appointment is confirmed after payment is verified.");
      });
      state.paymentElement.on("loaderror", function () {
        message("#pss-payment-status", "Payment could not load. Please try again.", "error");
        $("[data-retry-payment]").hidden = false;
      });
      state.paymentElement.mount("#pss-payment-element");
      track("checkout_started");
    } catch (_) {
      message("#pss-payment-status", "Payment could not load. Please try again.", "error");
      $("[data-retry-payment]").hidden = false;
    }
  }
  $("[data-retry-payment]").addEventListener("click", mountPayment);
  function paymentReturnUrl() {
    const url = new URL(CONFIG.returnUrl || window.location.origin + window.location.pathname, window.location.href);
    url.searchParams.set("pss_return", state.booking.id);
    return url.href;
  }
  $("#pss-payment-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    if (state.paying || !state.booking || !state.stripe || !state.elements) return;
    state.paying = true;
    $("[data-pay-button]").disabled = true;
    $("[data-pay-button]").firstChild.textContent = "Processing payment… ";
    savePendingBooking();
    message("#pss-payment-status", "Processing your payment. Please keep this page open.");
    try {
      const result = await state.stripe.confirmPayment({
        elements: state.elements,
        confirmParams: { return_url: paymentReturnUrl() },
        redirect: "if_required"
      });
      if (result.error) {
        message("#pss-payment-status", result.error.message || "Your payment was not completed. Please try again.", "error");
        $("[data-pay-button]").disabled = false;
        $("[data-pay-button]").firstChild.textContent = "Pay " + money(state.booking.amount) + " & Confirm Session ";
        return;
      }
      message("#pss-payment-status", "Checking payment and appointment confirmation…");
      await pollBooking();
    } catch (_) {
      message("#pss-payment-status", "We couldn't check the payment result. Check your booking status before trying another payment.", "error");
      $("[data-check-booking]").hidden = false;
    } finally { state.paying = false; }
  });
  function finishBooking(data) {
    if (data.status !== "confirmed" || data.booking_id !== state.booking.id || data.currency !== "USD" || ![1000, 1500].includes(data.amount) || !validTimestamp(data.appointment_start)) return;
    state.pollVersion++;
    ["#pss-intake", "#pss-calendar", "#pss-payment"].forEach(function (selector) { $(selector).hidden = true; });
    $("#pss-confirmation").hidden = false;
    const start = validTimestamp(data.appointment_start) ? data.appointment_start : state.booking.start;
    $("[data-confirmation-details]").textContent = start ? formatAppointment(start) : "Your session details will be included in your confirmation.";
    if (data.amount && [1000, 1500].includes(data.amount)) $("[data-summary-price]").textContent = money(data.amount);
    $("[data-summary-caption]").textContent = "Appointment confirmed";
    progress(5);
    lockBooking(true);
    try { sessionStorage.removeItem("ira_pss_pending_booking"); } catch (_) {}
    track("payment_succeeded");
    track("booking_confirmed");
    goTo($("#pss-confirmation"));
  }
  async function pollBooking() {
    if (!state.booking) return;
    const version = ++state.pollVersion;
    $("[data-check-booking]").hidden = true;
    for (let attempt = 0; attempt < 12; attempt++) {
      if (version !== state.pollVersion) return;
      try {
        const data = await request(CONFIG.bookingWebhook, { action: "booking_status", booking_id: state.booking.id, booking_token: state.booking.token });
        if (version !== state.pollVersion) return;
        if (data.booking_id !== state.booking.id || data.currency !== "USD" || ![1000, 1500].includes(data.amount) || !validTimestamp(data.appointment_start)) throw new Error("invalid_response");
        if (state.booking.amount !== null && data.amount !== state.booking.amount) throw new Error("price_mismatch");
        state.booking.amount = data.amount;
        state.booking.start = data.appointment_start;
        $("[data-payment-price]").textContent = money(data.amount);
        $("[data-payment-appointment]").textContent = formatAppointment(data.appointment_start);
        if (data.status === "confirmed") { finishBooking(data); return; }
        if (data.status === "expired") {
          message("#pss-payment-status", "This reservation has expired. Please check your booking rate again and choose a new time.", "error");
          state.booking = null;
          try { sessionStorage.removeItem("ira_pss_pending_booking"); } catch (_) {}
          lockBooking(false);
          hasExpiredVerification();
          return;
        }
        if (data.status === "payment_failed") {
          if (typeof data.payment_client_secret === "string" && /^pi_[a-zA-Z0-9]+_secret_/.test(data.payment_client_secret)) state.booking.secret = data.payment_client_secret;
          message("#pss-payment-status", "Your payment was not completed. Please try again.", "error");
          if (state.booking.secret) {
            $("#pss-payment-form").hidden = false;
            if (!state.elements) await mountPayment();
            $("[data-pay-button]").disabled = false;
            $("[data-pay-button]").firstChild.textContent = "Pay " + money(state.booking.amount) + " & Confirm Session ";
          }
          return;
        }
        if (!["payment_pending", "processing"].includes(data.status)) throw new Error("invalid_response");
        message("#pss-payment-status", "Payment and appointment confirmation are still processing. Please keep this page open.");
      } catch (_) {
        message("#pss-payment-status", "We couldn't check confirmation right now. Please use Check booking confirmation before making another payment.", "error");
        $("[data-check-booking]").hidden = false;
        return;
      }
      await new Promise(function (resolve) { setTimeout(resolve, 2000); });
    }
    if (version === state.pollVersion) {
      message("#pss-payment-status", "Confirmation is still processing. You can check again below; please do not make another payment.");
      $("[data-check-booking]").hidden = false;
    }
  }
  $("[data-check-booking]").addEventListener("click", pollBooking);
  function resumeBooking() {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("pss_return");
    if (!id) return;
    ["pss_return", "payment_intent", "payment_intent_client_secret", "redirect_status"].forEach(function (key) { url.searchParams.delete(key); });
    try { history.replaceState(null, "", url.pathname + url.search + url.hash); } catch (_) {}
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem("ira_pss_pending_booking") || "null"); } catch (_) {}
    if (!saved || saved.id !== id || typeof saved.token !== "string" || !saved.token) {
      message("#pss-verification-status", "We couldn't restore this booking in your browser. Please check your confirmation email before making another payment.", "error");
      goTo($("#pss-booking"));
      return;
    }
    state.booking = { id: saved.id, token: saved.token, amount: null, start: null, secret: null };
    lockBooking(true);
    $("#pss-payment").hidden = false;
    $("#pss-payment-form").hidden = true;
    $("[data-payment-price]").textContent = "Checking…";
    progress(4);
    goTo($("#pss-payment"));
    pollBooking();
  }
  const portrait = $("[data-portrait]");
  function showPortraitFallback() { portrait.hidden = true; $("[data-portrait-fallback]").hidden = false; }
  portrait.addEventListener("error", showPortraitFallback);
  if (portrait.complete && !portrait.naturalWidth) showPortraitFallback();
  const reviews = $("#pss-review-track");
  function reviewStep() {
    return reviews.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(reviews).columnGap || "0");
  }
  function updateReviews() {
    const step = reviewStep();
    const start = Math.round(reviews.scrollLeft / step);
    const visible = Math.max(1, Math.round((reviews.clientWidth + parseFloat(getComputedStyle(reviews).columnGap || "0")) / step));
    $("[data-review-prev]").disabled = reviews.scrollLeft < 3;
    $("[data-review-next]").disabled = reviews.scrollLeft >= reviews.scrollWidth - reviews.clientWidth - 3;
    $("[data-review-count]").textContent = (start + 1) + (visible > 1 ? "–" + Math.min(8, start + visible) : "") + " / 8";
  }
  $("[data-review-prev]").addEventListener("click", function () { reviews.scrollBy({ left: -reviewStep(), behavior: motion() }); });
  $("[data-review-next]").addEventListener("click", function () { reviews.scrollBy({ left: reviewStep(), behavior: motion() }); });
  reviews.addEventListener("scroll", updateReviews, { passive: true });
  reviews.addEventListener("keydown", function (event) {
    if (event.target !== reviews) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      reviews.scrollBy({ left: reviewStep() * (event.key === "ArrowRight" ? 1 : -1), behavior: motion() });
    }
  });
  $$("[data-expand-review]").forEach(function (button) {
    button.addEventListener("click", function () {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      button.closest(".pss-review").classList.toggle("is-expanded", !expanded);
      button.textContent = expanded ? "Read full review" : "Show less";
    });
  });
  let queuedScroll = false;
  function updateSticky() {
    const bookingRect = $("#pss-booking").getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const insideBooking = bookingRect.top < window.innerHeight && bookingRect.bottom > 0;
    $("[data-sticky-booking]").classList.toggle("is-visible", rootRect.top < -260 && rootRect.bottom > 150 && !insideBooking);
    queuedScroll = false;
  }
  window.addEventListener("scroll", function () {
    if (!queuedScroll) { queuedScroll = true; requestAnimationFrame(updateSticky); }
  }, { passive: true });
  window.addEventListener("resize", function () { updateReviews(); updateSticky(); });
  updateReviews();
  updateSticky();
  track("page_viewed");
  resumeBooking();
}());
