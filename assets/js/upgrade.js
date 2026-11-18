(() => {
  "strict";

  const LS = {
    theme: "mk-theme-v1",
    visitor: "mk-visitor-v1",
    session: "mk-session-v1",
    preferences: "mk-portfolio-preferences-v1"
  };
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char]));
  const isArabic = () => window.PortfolioDataBridge?.getLanguage?.() === "ar";
  const projects = () => window.PortfolioDataBridge?.getProjects?.() || [];
  let supabase = null;
  let availability = { status: "available", message_en: "Available for selected projects.", message_ar: "متاح للمشاريع المختارة.", expected_date: null, inquiries_enabled: true };

  function randomKey(prefix) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return `${prefix}_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  }

  function visitorKeys() {
    let visitor = localStorage.getItem(LS.visitor);
    if (!visitor) {
      visitor = randomKey("visitor");
      localStorage.setItem(LS.visitor, visitor);
    }
    let session = sessionStorage.getItem(LS.session);
    if (!session) {
      session = randomKey("session");
      sessionStorage.setItem(LS.session, session);
    }
    return { visitor, session };
  }

  async function getSupabase() {
    if (supabase) return supabase;
    supabase = window.PortfolioDataBridge?.getSupabase?.() || null;
    if (!supabase) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      supabase = window.PortfolioDataBridge?.getSupabase?.() || null;
    }
    return supabase;
  }

  function modalShell(id, title, content, compact = false) {
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const el = document.createElement("div");
    el.id = id;
    el.className = "upgrade-modal";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.innerHTML = `<div class="upgrade-dialog ${compact ? "compact" : ""}"><div class="upgrade-actions"><div><span class="upgrade-kicker">${isArabic() ? "استوديو مصطفى خالد" : "Mostafa Khaled Studio"}</span><h2 class="upgrade-title">${escape(title)}</h2></div><button type="button" class="upgrade-close" aria-label="${isArabic() ? "إغلاق" : "Close"}">×</button></div>${content}</div>`;
    document.body.appendChild(el);
    el.querySelector(".upgrade-close").addEventListener("click", () => el.remove());
    el.addEventListener("mousedown", (event) => { if (event.target === el) el.remove(); });
    el.querySelector("input,textarea,select,button")?.focus();
    return el;
  }

  function applyTheme(theme, animate = true) {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (animate && !reduced) document.body.classList.add("theme-transition");
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(LS.theme, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? "#141517" : "#D9DADB";
    if (animate && !reduced) setTimeout(() => document.body.classList.remove("theme-transition"), 260);
  }

  function initializeTheme() {
    let theme = localStorage.getItem(LS.theme);
    if (!theme) theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    applyTheme(theme, false);
    const utilities = document.getElementById("headerUtilityControls");
    if (!utilities || document.getElementById("themeToggleBtn")) return;
    const button = document.createElement("button");
    button.id = "themeToggleBtn";
    button.type = "button";
    button.className = "h-8 px-2.5 rounded-full text-[#111214] hover:bg-white/60 transition-all";
    button.setAttribute("aria-label", "Toggle theme");
    button.textContent = "◐";
    utilities.insertBefore(button, utilities.firstChild);
    button.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  }

  function normalizeText(value) {
    return String(value || "")
      .toLocaleLowerCase()
      .normalize("NFKC")
      .replace(/[إأآا]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[^\p{L}\p{N}\s]+/gu, " ");
  }

  function searchProjects(query) {
    const normalized = normalizeText(query);
    if (!normalized.trim()) return projects();
    const terms = normalized.split(/\s+/).filter(Boolean);
    const scores = { "3d": ["3d", "cgi", "blender", "product", "exhibition", "booth"], branding: ["brand", "branding", "identity", "logo"], social: ["social", "campaign", "marketing"], realestate: ["real estate", "عقار", "compound", "property"], packaging: ["packaging", "package", "product"], ui: ["ui", "interface", "app", "application"] };
    return projects().map((project) => {
      const text = normalizeText([
        project.titleEn, project.titleAr, project.categoryEn, project.categoryAr,
        project.descriptionEn, project.descriptionAr, project.deliverablesEn, project.deliverablesAr,
        project.location, project.locationAr, ...(project.tools || [])
      ].filter(Boolean).join(" "));
      let score = 0;
      terms.forEach((term) => {
        if (text.includes(term)) score += 4;
        Object.entries(scores).forEach(([, words]) => {
          if (words.includes(term) && words.some((word) => text.includes(word))) score += 2;
        });
      });
      return { project, score };
    }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).map((entry) => entry.project).slice(0, 9);
  }

  function openSearch() {
    const title = isArabic() ? "ابحث في الأعمال" : "Search projects";
    const modal = modalShell("portfolioSearchModal", title, `
      <div class="upgrade-search"><input id="portfolioSearchInput" type="search" autocomplete="off" placeholder="${isArabic() ? "مثال: هوية عقارية أو معرض 3D..." : "Try: 3D product, exhibition, branding..."}" /></div>
      <div id="portfolioSearchResults" class="upgrade-results"></div>
    `);
    const input = modal.querySelector("#portfolioSearchInput");
    const results = modal.querySelector("#portfolioSearchResults");
    const render = () => {
      const found = searchProjects(input.value);
      results.innerHTML = found.map((project) => `
        <button type="button" class="upgrade-result" data-project-id="${project.id}">
          <img src="${escape(project.imageUrl)}" alt="" loading="lazy" />
          <div><strong>${escape(isArabic() ? project.titleAr : project.titleEn)}</strong><span>${escape(isArabic() ? project.categoryAr : project.categoryEn)} · ${escape(project.year)}</span></div>
        </button>
      `).join("") || `<p>${isArabic() ? "لا توجد نتائج مطابقة." : "No matching projects found."}</p>`;
      results.querySelectorAll("[data-project-id]").forEach((button) => button.addEventListener("click", () => {
        modal.remove();
        window.PortfolioDataBridge?.openProject?.(Number(button.dataset.projectId));
      }));
    };
    input.addEventListener("input", render);
    render();
  }

  function openCommandPalette() {
    const commands = [
      { label: isArabic() ? "العودة للرئيسية" : "Go to Home", action: () => window.PortfolioDataBridge?.switchPage?.("home") },
      { label: isArabic() ? "تصفح الأعمال" : "Browse Projects", action: openSearch },
      { label: isArabic() ? "السيرة المهنية" : "Open Resume", action: () => window.PortfolioDataBridge?.switchPage?.("resume") },
      { label: isArabic() ? "الشركاء" : "Open Partners", action: () => window.PortfolioDataBridge?.switchPage?.("partners") },
      { label: isArabic() ? "نبذة عني" : "Open About", action: () => window.PortfolioDataBridge?.switchPage?.("about") },
      { label: isArabic() ? "التواصل" : "Open Contact", action: openContactForm },
      { label: isArabic() ? "سؤال موجز للمشروع" : "Create Project Brief", action: openBrief },
      { label: isArabic() ? "توليد بورتفوليو PDF" : "Create Custom PDF", action: openPdfSelector },
      { label: isArabic() ? "التبديل للوضع الداكن" : "Switch to Dark Theme", action: () => applyTheme("dark") },
      { label: isArabic() ? "التبديل للوضع الفاتح" : "Switch to Light Theme", action: () => applyTheme("light") }
    ];
    const modal = modalShell("commandPalette", isArabic() ? "لوحة الأوامر" : "Command palette", `<div class="command-palette"><input id="commandInput" type="search" autocomplete="off" placeholder="${isArabic() ? "ابحث عن أمر..." : "Search commands..."}" /><div id="commandList" class="command-list"></div></div>`, true);
    const input = modal.querySelector("#commandInput");
    const list = modal.querySelector("#commandList");
    let filtered = commands;
    let active = 0;
    const render = () => {
      list.innerHTML = filtered.map((command, index) => `<button type="button" class="command-item ${index === active ? "active" : ""}" data-index="${index}"><span>${escape(command.label)}</span><span>↵</span></button>`).join("");
      list.querySelectorAll(".command-item").forEach((item) => item.addEventListener("click", () => {
        modal.remove();
        filtered[Number(item.dataset.index)].action();
      }));
    };
    input.addEventListener("input", () => {
      const term = normalizeText(input.value);
      filtered = commands.filter((command) => normalizeText(command.label).includes(term));
      active = 0;
      render();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") { active = Math.min(filtered.length - 1, active + 1); event.preventDefault(); render(); }
      if (event.key === "ArrowUp") { active = Math.max(0, active - 1); event.preventDefault(); render(); }
      if (event.key === "Enter" && filtered[active]) { modal.remove(); filtered[active].action(); }
      if (event.key === "Escape") modal.remove();
    });
    render();
  }

  async function recordEvent(eventType, metadata = {}) {
    if (sessionStorage.getItem("mk-analytics-opt-out") === "1") return;
    const keys = visitorKeys();
    try {
      const client = await getSupabase();
      if (!client) return;
      await client.from("portfolio_analytics_events").insert({
        visitor_key: keys.visitor,
        session_key: keys.session,
        event_type: eventType,
        project_id: metadata.projectId ? String(metadata.projectId) : null,
        path: location.hash || location.pathname,
        metadata
      });
    } catch (error) {
      console.debug("Analytics event was not recorded.", error);
    }
  }

  async function loadAvailability() {
    try {
      const client = await getSupabase();
      if (!client) return;
      const { data } = await client.from("portfolio_availability").select("*").eq("id", 1).maybeSingle();
      if (data) availability = data;
    } catch (error) {
      console.debug("Availability could not be loaded.", error);
    }
  }

  function availabilityBanner() {
    if (!availability?.status) return;
    const current = document.getElementById("availabilityUpgradeBanner");
    if (current) current.remove();
    const arabic = isArabic();
    const statusLabel = availability.status === "limited" ? (arabic ? "توفر محدود" : "Limited Availability") : availability.status === "unavailable" ? (arabic ? "غير متاح حاليًا" : "Currently Unavailable") : (arabic ? "متاح للمشاريع" : "Available for Projects");
    const message = arabic ? availability.message_ar : availability.message_en;
    const banner = document.createElement("aside");
    banner.id = "availabilityUpgradeBanner";
    banner.className = "availability-banner";
    banner.innerHTML = `<button type="button"><span class="upgrade-status"><span class="upgrade-status-dot ${availability.status}"></span>${escape(statusLabel)}</span><span style="display:block;margin-top:6px;font-size:11px;line-height:1.5">${escape(message)}${availability.expected_date ? `<br>${escape(arabic ? "موعد عودة الاتاحة" : "Next availability")}: ${escape(availability.expected_date)}` : ""}</span></button>`;
    banner.querySelector("button").addEventListener("click", openContactForm);
    document.body.appendChild(banner);
  }

  async function submitInquiry(payload) {
    payload.description = payload.description || payload.brief?.description || "";
    payload.spam_score = spamScore(payload);
    if (payload.spam_score >= 3) payload.status = "spam";
    const client = await getSupabase();
    if (!client) throw new Error(isArabic() ? "الخدمة غير متاحة حاليًا." : "Submission service is unavailable.");
    const { error } = await client.from("portfolio_inquiries").insert(payload);
    if (error) throw error;
  }

  function spamScore(payload) {
    let score = 0;
    const text = `${payload.name || ""} ${payload.description || ""}`.toLowerCase();
    if (/https?:\/\/|www\./i.test(text)) score += 2;
    if (/buy now|crypto|casino|seo.{0,20}guarantee/i.test(text)) score += 2;
    if (!payload.email && !payload.description) score += 1;
    return score;
  }

  function openContactForm() {
    if (availability.status === "unavailable" || availability.inquiries_enabled === false) {
      alert(isArabic() ? "الاستفسارات مغلقة حاليًا. يرجى التواصل عبر القنوات المتاحة." : "New inquiries are currently closed. Please use an existing contact channel.");
      return;
    }
    const modal = modalShell("projectContactModal", isArabic() ? "ابدأ مشروعك" : "Start a Project", `
      <form id="upgradeContactForm">
        <div class="upgrade-grid">
          <label class="upgrade-field">${isArabic() ? "الاسم" : "Name"}<input name="name" required maxlength="120" /></label>
          <label class="upgrade-field">${isArabic() ? "اسم الشركة" : "Company"}<input name="company" maxlength="160" /></label>
          <label class="upgrade-field">${isArabic() ? "البريد الإلكتروني" : "Email"}<input name="email" type="email" required maxlength="180" /></label>
          <label class="upgrade-field">${isArabic() ? "الدولة" : "Country"}<input name="country" maxlength="100" /></label>
          <label class="upgrade-field">${isArabic() ? "نوع المشروع" : "Project type"}<select name="project_type"><option>Graphic Design</option><option>Branding & Visual Identity</option><option>Social Media Design</option><option>Print & Editorial</option><option>3D Product Visualization</option><option>Exhibition & Spatial Design</option><option>Motion Graphics</option><option>Other</option></select></label>
          <label class="upgrade-field">${isArabic() ? "الميزانية" : "Budget"}<select name="budget"><option>Not specified</option><option>Under $1,000</option><option>$1,000–$3,000</option><option>$3,000–$7,000</option><option>$7,000+</option></select></label>
        </div>
        <label class="upgrade-field">${isArabic() ? "وصف المشروع" : "Project description"}<textarea name="description" required maxlength="5000" rows="5"></textarea></label>
        <input name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px" />
        <p id="upgradeContactStatus" class="upgrade-kicker" aria-live="polite"></p>
        <div class="upgrade-actions"><button type="button" class="upgrade-btn secondary" data-brief>${isArabic() ? "إنشاء موجز تفصيلي" : "Create detailed brief"}</button><button type="submit" class="upgrade-btn">${isArabic() ? "إرسال الاستفسار" : "Send inquiry"}</button></div>
      </form>
    `);
    modal.querySelector("[data-brief]").addEventListener("click", () => { modal.remove(); openBrief(); });
    modal.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      if (event.currentTarget.website?.value) return;
      const form = new FormData(event.currentTarget);
      const payload = {
        kind: "contact",
        name: String(form.get("name") || "").trim(),
        company: String(form.get("company") || "").trim(),
        email: String(form.get("email") || "").trim(),
        country: String(form.get("country") || "").trim(),
        project_type: String(form.get("project_type") || "").trim(),
        budget: String(form.get("budget") || "").trim(),
        description: String(form.get("description") || "").trim(),
        brief: {},
        attachment_names: [],
        status: "new"
      };
      const status = modal.querySelector("#upgradeContactStatus");
      status.textContent = isArabic() ? "جارٍ الإرسال…" : "Sending…";
      try {
        await submitInquiry(payload);
        await recordEvent("contact_submission", { projectType: payload.project_type });
        status.textContent = isArabic() ? "تم إرسال الاستفسار بنجاح." : "Inquiry submitted successfully.";
        setTimeout(() => modal.remove(), 900);
      } catch (error) {
        status.textContent = isArabic() ? "تعذر الإرسال. استخدم البريد أو واتساب." : "Unable to submit. Please use email or WhatsApp.";
        console.error(error);
      }
    });
  }

  function openBrief() {
    if (availability.status === "unavailable" || availability.inquiries_enabled === false) {
      openContactForm();
      return;
    }
    const modal = modalShell("projectBriefModal", isArabic() ? "مولد موجز المشروع" : "Project Brief Generator", `
      <form id="upgradeBriefForm">
        <div class="brief-progress"><span id="briefProgress" style="width:25%"></span></div>
        <section class="brief-step active" data-step="1">
          <label class="upgrade-field">${isArabic() ? "عنوان المشروع" : "Project title"}<input name="title" required maxlength="160" /></label>
          <label class="upgrade-field">${isArabic() ? "نوع المشروع" : "Project type"}<select name="projectType" required><option>Graphic Design</option><option>Branding & Visual Identity</option><option>Social Media Design</option><option>Print & Editorial</option><option>3D Product Visualization</option><option>Exhibition & Spatial Design</option><option>Motion Graphics</option><option>Other</option></select></label>
          <label class="upgrade-field">${isArabic() ? "اسم الشركة أو العلامة" : "Company / brand"}<input name="company" maxlength="160" /></label>
        </section>
        <section class="brief-step" data-step="2">
          <div class="upgrade-grid"><label class="upgrade-field">${isArabic() ? "المجال الصناعي" : "Industry"}<input name="industry" maxlength="160" /></label><label class="upgrade-field">${isArabic() ? "الجمهور المستهدف" : "Target audience"}<input name="audience" maxlength="240" /></label><label class="upgrade-field">${isArabic() ? "الدولة المستهدفة" : "Target country"}<input name="targetCountry" maxlength="100" /></label><label class="upgrade-field">${isArabic() ? "الميزانية" : "Budget"}<input name="budget" maxlength="100" /></label></div>
          <label class="upgrade-field">${isArabic() ? "الأهداف والمتطلبات التفصيلية" : "Objectives & requirements"}<textarea name="requirements" required maxlength="5000" rows="6"></textarea></label>
        </section>
        <section class="brief-step" data-step="3">
          <label class="upgrade-field">${isArabic() ? "المخرجات المطلوبة" : "Required deliverables"}<textarea name="deliverables" required maxlength="3000" rows="4"></textarea></label>
          <div class="upgrade-grid"><label class="upgrade-field">${isArabic() ? "حجم المشروع" : "Estimated size"}<select name="size"><option>Small</option><option>Medium</option><option>Large</option></select></label><label class="upgrade-field">${isArabic() ? "الجدول الزمني" : "Timeline"}<input name="timeline" maxlength="160" /></label></div>
          <label class="upgrade-field">${isArabic() ? "طريقة التواصل المفضلة" : "Preferred communication"}<select name="communication"><option>WhatsApp</option><option>Email</option><option>Video call</option></select></label>
          <label class="upgrade-field">${isArabic() ? "مراجع وملفات (أسماء الملفات فقط)" : "Reference files (names only)"}<input name="files" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.zip" /></label>
        </section>
        <section class="brief-step" data-step="4"><div id="briefReview" class="upgrade-grid"></div></section>
        <p id="briefStatus" class="upgrade-kicker" aria-live="polite"></p>
        <div class="upgrade-actions"><button type="button" id="briefBack" class="upgrade-btn secondary">${isArabic() ? "السابق" : "Back"}</button><button type="button" id="briefNext" class="upgrade-btn">${isArabic() ? "التالي" : "Next"}</button></div>
      </form>
    `);
    let step = 1;
    const form = modal.querySelector("form");
    const progress = modal.querySelector("#briefProgress");
    const back = modal.querySelector("#briefBack");
    const next = modal.querySelector("#briefNext");
    const status = modal.querySelector("#briefStatus");
    const showStep = () => {
      modal.querySelectorAll(".brief-step").forEach((section) => section.classList.toggle("active", Number(section.dataset.step) === step));
      progress.style.width = `${step * 25}%`;
      back.disabled = step === 1;
      next.textContent = step === 4 ? (isArabic() ? "إرسال الموجز" : "Submit brief") : (isArabic() ? "التالي" : "Next");
      if (step === 4) {
        const data = new FormData(form);
        const names = [...(form.elements.files?.files || [])].map((file) => file.name);
        const entries = [
          ["title", data.get("title")], ["projectType", data.get("projectType")], ["company", data.get("company")],
          ["industry", data.get("industry")], ["audience", data.get("audience")], ["targetCountry", data.get("targetCountry")],
          ["budget", data.get("budget")], ["deliverables", data.get("deliverables")], ["timeline", data.get("timeline")],
          ["communication", data.get("communication")], ["files", names.join(", ") || "None"]
        ];
        modal.querySelector("#briefReview").innerHTML = entries.map(([key, value]) => `<div><span class="upgrade-kicker">${escape(key)}</span><p style="margin:4px 0 0;font-size:12px">${escape(value)}</p></div>`).join("");
      }
    };
    back.addEventListener("click", () => { if (step > 1) { step -= 1; showStep(); } });
    next.addEventListener("click", async () => {
      if (step < 4) {
        const section = modal.querySelector(`.brief-step[data-step="${step}"]`);
        const fields = [...section.querySelectorAll("[required]")];
        if (fields.some((field) => !field.reportValidity())) return;
        step += 1;
        showStep();
        return;
      }
      const data = new FormData(form);
      const names = [...(form.elements.files?.files || [])].map((file) => file.name).filter((name) => name.length <= 180);
      const brief = {
        title: String(data.get("title") || ""),
        projectType: String(data.get("projectType") || ""),
        company: String(data.get("company") || ""),
        industry: String(data.get("industry") || ""),
        audience: String(data.get("audience") || ""),
        targetCountry: String(data.get("targetCountry") || ""),
        budget: String(data.get("budget") || ""),
        requirements: String(data.get("requirements") || ""),
        deliverables: String(data.get("deliverables") || ""),
        size: String(data.get("size") || ""),
        timeline: String(data.get("timeline") || ""),
        communication: String(data.get("communication") || "")
      };
      status.textContent = isArabic() ? "جارٍ إرسال الموجز…" : "Submitting brief…";
      try {
        await submitInquiry({
          kind: "brief",
          name: brief.company || brief.title,
          company: brief.company,
          email: null,
          country: brief.targetCountry,
          project_type: brief.projectType,
          budget: brief.budget,
          description: brief.requirements,
          brief,
          attachment_names: names,
          status: "new"
        });
        await recordEvent("brief_submission", { projectType: brief.projectType });
        status.textContent = isArabic() ? "تم إرسال موجز المشروع بنجاح." : "Project brief submitted successfully.";
        setTimeout(() => modal.remove(), 1000);
      } catch (error) {
        status.textContent = isArabic() ? "تعذر إرسال الموجز." : "Unable to submit the brief.";
        console.error(error);
      }
    });
    showStep();
  }

  async function openPdfSelector() {
    const modal = modalShell("customPdfModal", isArabic() ? "أنشئ بورتفوليو مخصص" : "Create a Custom Portfolio PDF", `
      <div class="upgrade-actions"><label class="upgrade-field" style="width:220px">${isArabic() ? "تصفية حسب التصنيف" : "Filter by category"}<select id="pdfCategoryFilter"><option value="">${isArabic() ? "كل التصنيفات" : "All categories"}</option></select></label><button type="button" id="selectAllPdfProjects" class="upgrade-btn secondary">${isArabic() ? "تحديد الكل" : "Select all"}</button></div>
      <div id="pdfProjectList" class="pdf-project-list"></div>
      <p id="pdfStatus" class="upgrade-kicker" aria-live="polite"></p>
      <button type="button" id="generatePdfBtn" class="upgrade-btn">${isArabic() ? "إنشاء PDF وتنزيله" : "Generate & download PDF"}</button>
    `);
    const filter = modal.querySelector("#pdfCategoryFilter");
    const list = modal.querySelector("#pdfProjectList");
    const categories = [...new Set(projects().map((project) => isArabic() ? project.categoryAr : project.categoryEn).filter(Boolean))].sort();
    filter.innerHTML += categories.map((category) => `<option value="${escape(category)}">${escape(category)}</option>`).join("");
    const renderList = () => {
      const category = filter.value;
      const visible = projects().filter((project) => !category || (isArabic() ? project.categoryAr : project.categoryEn) === category);
      list.innerHTML = visible.map((project) => `<label class="pdf-project-option"><input type="checkbox" name="selectedPdfProject" value="${project.id}" checked /><span><strong>${escape(isArabic() ? project.titleAr : project.titleEn)}</strong><br><span class="upgrade-kicker">${escape(isArabic() ? project.categoryAr : project.categoryEn)}</span></span></label>`).join("");
    };
    filter.addEventListener("change", renderList);
    modal.querySelector("#selectAllPdfProjects").addEventListener("click", () => list.querySelectorAll("input").forEach((input) => { input.checked = true; }));
    renderList();
    modal.querySelector("#generatePdfBtn").addEventListener("click", async () => {
      const selectedIds = new Set([...list.querySelectorAll("input:checked")].map((input) => Number(input.value)));
      const selected = projects().filter((project) => selectedIds.has(project.id));
      if (!selected.length) {
        modal.querySelector("#pdfStatus").textContent = isArabic() ? "اختر مشروعًا واحدًا على الأقل." : "Select at least one project.";
        return;
      }
      const status = modal.querySelector("#pdfStatus");
      status.textContent = isArabic() ? "جارٍ إنشاء ملف PDF…" : "Generating PDF…";
      try {
        if (!window.jspdf) await loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js");
        const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
        let y = 30;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.text(isArabic() ? "مصطفى خالد" : "Mostafa Khaled", 18, y);
        y += 12;
        doc.setFontSize(12);
        doc.text(isArabic() ? "بورتفوليو إبداعي مخصص" : "Selected Creative Portfolio", 18, y);
        y += 16;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(isArabic() ? "مختارات الأعمال" : "Selected Projects", 18, y);
        y += 10;
        selected.forEach((project) => {
          if (y > 255) { doc.addPage(); y = 22; }
          const title = isArabic() ? project.titleAr : project.titleEn;
          const description = isArabic() ? project.descriptionAr : project.descriptionEn;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(13);
          doc.text(String(title || ""), 18, y);
          y += 7;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          const category = isArabic() ? project.categoryAr : project.categoryEn;
          doc.text(`${category || ""} | ${project.year || ""} | ${isArabic() ? project.locationAr : project.location || ""}`, 18, y);
          y += 6;
          const lines = doc.splitTextToSize(String(description || ""), 174);
          doc.text(lines, 18, y);
          y += lines.length * 4.5 + 8;
        });
        doc.save("Mostafa_Khaled_Selected_Portfolio.pdf");
        await recordEvent("pdf_download", { selected: selected.length });
        status.textContent = isArabic() ? "تم إنشاء وتنزيل ملف PDF." : "PDF generated and downloaded.";
      } catch (error) {
        status.textContent = isArabic() ? "تعذر إنشاء ملف PDF." : "Unable to generate PDF.";
        console.error(error);
      }
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function addUtilityButtons() {
    const utilities = document.getElementById("headerUtilityControls");
    if (!utilities) return;
    if (!document.getElementById("portfolioSearchBtn")) {
      const search = document.createElement("button");
      search.id = "portfolioSearchBtn";
      search.type = "button";
      search.className = "h-8 px-2 rounded-full text-xs font-semibold text-[#111214] hover:bg-white/60";
      search.setAttribute("aria-label", "Search projects");
      search.textContent = "⌕";
      search.addEventListener("click", openSearch);
      utilities.insertBefore(search, utilities.firstChild);
    }

    function addUpgradeFloatingActions() {
      if (document.getElementById("upgradeActionDock")) return;
      const dock = document.createElement("div");
      dock.id = "upgradeActionDock";
      dock.className = "fixed bottom-4 start-1/2 z-[9500] hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/80 bg-white/75 p-1.5 shadow-lg backdrop-blur md:flex";
      dock.innerHTML = `
        <button type="button" data-upgrade-action="brief" class="rounded-full px-3 py-2 text-[10px] font-bold text-[#111214] hover:bg-white">${isArabic() ? "موجز مشروع" : "Project brief"}</button>
        <button type="button" data-upgrade-action="pdf" class="rounded-full px-3 py-2 text-[10px] font-bold text-[#111214] hover:bg-white">${isArabic() ? "PDF مخصص" : "Custom PDF"}</button>
      `;
      dock.querySelector('[data-upgrade-action="brief"]').addEventListener("click", openBrief);
      dock.querySelector('[data-upgrade-action="pdf"]').addEventListener("click", openPdfSelector);
      document.body.appendChild(dock);
    }
  }

  function installPwa() {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(console.error);
  }

  function easterEggs() {
    let secret = "";
    window.addEventListener("keydown", (event) => {
      secret = (secret + event.key.toLocaleLowerCase()).slice(-2);
      if (secret === "mk") applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    });
  }

  function enhanceImageLoading() {
    const observer = new MutationObserver(() => {
      document.querySelectorAll("img:not([data-upgrade-image])").forEach((image, index) => {
        image.dataset.upgradeImage = "1";
        if (!image.loading) image.loading = index === 0 ? "eager" : "lazy";
        if (!image.decoding) image.decoding = "async";
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.openProjectContactForm = openContactForm;
  window.openProjectBrief = openBrief;
  window.openCustomPortfolioPdf = openPdfSelector;
  window.openPortfolioSearch = openSearch;
  window.openPortfolioCommandPalette = openCommandPalette;

  function adminPanel() {
    if (!window.PortfolioDataBridge?.isAdmin?.()) return;
    const nav = document.querySelector(".cms-dashboard-nav");
    const content = document.querySelector(".cms-dashboard-content");
    if (!nav || !content || document.querySelector('[data-cms-tab="analytics"]')) return;
    const tab = document.createElement("button");
    tab.type = "button";
    tab.dataset.cmsTab = "analytics";
    tab.className = "cms-tab-btn text-slateText font-semibold";
    tab.setAttribute("aria-pressed", "false");
    tab.innerHTML = '<span class="cms-tab-number">09</span><span class="cms-tab-label">Analytics & Inquiries</span>';
    nav.appendChild(tab);
    const panel = document.createElement("div");
    panel.id = "cmsTabAnalytics";
    panel.className = "cms-tab-panel hidden glass-card rounded-[28px] p-6 sm:p-8";
    panel.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3"><div><h3 class="text-lg font-bold text-obsidian">Portfolio analytics</h3><p class="text-xs text-slateText">Privacy-conscious first-party event totals.</p></div><button type="button" id="analyticsExportBtn" class="upgrade-btn secondary">Export CSV</button></div>
      <div id="availabilityAdminEditor" class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2"></div>
      <div id="analyticsSummary" class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"></div>
      <h4 class="mt-8 mb-3 text-sm font-bold text-obsidian">Recent inquiries</h4><div id="inquiriesAdminList" class="space-y-3"></div>
    `;
    content.appendChild(panel);
    tab.addEventListener("click", () => {
      document.querySelectorAll(".cms-tab-btn").forEach((button) => button.classList.remove("active"));
      document.querySelectorAll(".cms-tab-panel").forEach((section) => section.classList.add("hidden"));
      tab.classList.add("active");
      panel.classList.remove("hidden");
      loadAdminPanel();
    });
  }

  async function loadAdminPanel() {
    const client = await getSupabase();
    if (!client) return;
    const availabilityResult = await client.from("portfolio_availability").select("*").eq("id", 1).maybeSingle();
    const current = availabilityResult.data || { status: "available", message_en: "", message_ar: "", expected_date: "", inquiries_enabled: true };
    const editor = document.getElementById("availabilityAdminEditor");
    editor.innerHTML = `
      <label class="upgrade-field">Status<select id="adminAvailabilityStatus"><option value="available" ${current.status === "available" ? "selected" : ""}>Available</option><option value="limited" ${current.status === "limited" ? "selected" : ""}>Limited</option><option value="unavailable" ${current.status === "unavailable" ? "selected" : ""}>Unavailable</option></select></label>
      <label class="upgrade-field">Expected date<input id="adminAvailabilityDate" type="date" value="${escape(current.expected_date || "")}" /></label>
      <label class="upgrade-field">Message (EN)<textarea id="adminAvailabilityEn" rows="3">${escape(current.message_en || "")}</textarea></label>
      <label class="upgrade-field">Message (AR)<textarea id="adminAvailabilityAr" rows="3" dir="rtl">${escape(current.message_ar || "")}</textarea></label>
      <label class="upgrade-field"><span><input id="adminAvailabilityInquiries" type="checkbox" ${current.inquiries_enabled ? "checked" : ""} /> Enable project inquiries</span></label>
      <button type="button" id="saveAvailabilityBtn" class="upgrade-btn" style="align-self:end">Save availability</button>
    `;
    document.getElementById("saveAvailabilityBtn").addEventListener("click", async () => {
      await client.from("portfolio_availability").update({
        status: document.getElementById("adminAvailabilityStatus").value,
        expected_date: document.getElementById("adminAvailabilityDate").value || null,
        message_en: document.getElementById("adminAvailabilityEn").value,
        message_ar: document.getElementById("adminAvailabilityAr").value,
        inquiries_enabled: document.getElementById("adminAvailabilityInquiries").checked,
        updated_at: new Date().toISOString()
      }).eq("id", 1);
      await loadAvailability();
      availabilityBanner();
    });
    const eventsResult = await client.from("portfolio_analytics_events").select("event_type,project_id,created_at").order("created_at", { ascending: false }).limit(5000);
    const events = eventsResult.data || [];
    const counts = events.reduce((acc, event) => { acc[event.event_type] = (acc[event.event_type] || 0) + 1; return acc; }, {});
    const summaries = [
      ["Page / project views", (counts.project_view || 0) + (counts.page_view || 0)],
      ["PDF downloads", counts.pdf_download || 0],
      ["Contact submissions", counts.contact_submission || 0],
      ["Brief submissions", counts.brief_submission || 0]
    ];
    document.getElementById("analyticsSummary").innerHTML = summaries.map(([label, value]) => `<div class="ios-subcard rounded-2xl p-4"><span class="upgrade-kicker">${escape(label)}</span><strong style="display:block;font-size:24px;margin-top:5px">${value}</strong></div>`).join("");
    const inquiriesResult = await client.from("portfolio_inquiries").select("*").order("created_at", { ascending: false }).limit(100);
    const inquiries = inquiriesResult.data || [];
    document.getElementById("inquiriesAdminList").innerHTML = inquiries.map((inquiry) => `
      <article class="ios-subcard rounded-2xl p-4"><div class="flex items-center justify-between gap-3"><strong>${escape(inquiry.name)}</strong><select data-inquiry-status="${escape(inquiry.id)}"><option ${inquiry.status === "new" ? "selected" : ""}>new</option><option ${inquiry.status === "reviewing" ? "selected" : ""}>reviewing</option><option ${inquiry.status === "approved" ? "selected" : ""}>approved</option><option ${inquiry.status === "closed" ? "selected" : ""}>closed</option><option ${inquiry.status === "spam" ? "selected" : ""}>spam</option></select></div><p class="mt-2 text-xs text-slateText">${escape(inquiry.project_type || inquiry.kind)} · ${escape(inquiry.description || "")}</p></article>
    `).join("") || `<p class="text-xs text-slateText">No inquiries yet.</p>`;
    document.querySelectorAll("[data-inquiry-status]").forEach((select) => select.addEventListener("change", async () => {
      await client.from("portfolio_inquiries").update({ status: select.value, updated_at: new Date().toISOString() }).eq("id", select.dataset.inquiryStatus);
    }));
    document.getElementById("analyticsExportBtn").onclick = () => {
      const csv = ["event_type,project_id,created_at", ...events.map((event) => [event.event_type, event.project_id || "", event.created_at].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))].join("\n");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      link.download = "portfolio-analytics.csv";
      link.click();
      URL.revokeObjectURL(link.href);
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    initializeTheme();
    addUtilityButtons();
    addUpgradeFloatingActions();
    enhanceImageLoading();
    installPwa();
    easterEggs();
    loadAvailability().then(availabilityBanner);
    recordEvent("page_view");

    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        openCommandPalette();
      }
      if (event.key === "Escape") document.querySelectorAll(".upgrade-modal").forEach((modal) => modal.remove());
    });

    const hashObserver = setInterval(() => {
      if (location.hash.startsWith("#project/")) {
        const projectId = location.hash.split("/")[1];
        const key = `mk-project-viewed-${projectId}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          recordEvent("project_view", { projectId });
        }
      }
      adminPanel();
    }, 1500);
    window.addEventListener("beforeunload", () => clearInterval(hashObserver));
  });
})();
