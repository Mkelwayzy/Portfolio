
    let currentLang = "en";
    let resumeCountryFilter = "ALL";
    let partnersSectorFilter = "ALL";
    let activeProjectId = 1;

    // ==================== ADMIN CMS STATE & PERSISTENCE ====================
    const CMS_STORAGE_KEY = "mk_studio_cms_state_v1";
    const CMS_CONTENT_TABLE = "portfolio_content";
    const CMS_MEDIA_BUCKET = "portfolio-assets";
    const CMS_PROJECT_COVER_ASPECT_VERSION = 1;
    const CMS_ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml"]);
    const CMS_PROJECT_PDF_TYPE = "application/pdf";
    const CMS_PROJECT_PDF_MAX_BYTES = 100 * 1024 * 1024;
    const CMS_MEDIA_ASPECTS = ["aspect-auto", "aspect-[4/3]", "aspect-video", "aspect-square", "aspect-[3/4]", "aspect-[21/9]"];
    const CMS_PROJECT_COUNTRIES = [
      { value: "Egypt", arabic: "مصر" },
      { value: "Saudi Arabia", arabic: "السعودية" },
      { value: "Kuwait", arabic: "الكويت" },
      { value: "Oman", arabic: "عُمان" }
    ];
    const supabaseConfig = window.PORTFOLIO_SUPABASE_CONFIG;
    const supabaseClient = window.supabase?.createClient && supabaseConfig?.url && supabaseConfig?.publishableKey
      ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.publishableKey)
      : null;
    let isAdminAuthenticated = false;
    let cmsRemoteStateLoaded = false;
    let cmsRemoteStateExists = false;
    let lastCmsSaveError = "";

    const defaultCmsConfig = {
      studioTagEn: "Mostafa Khaled Studio",
      studioTagAr: "استوديو مصطفى خالد",
      heroTitleEn: "Express Your Brand with\nOur Visual Craft",
      heroTitleAr: "عبّر عن علامتك التجارية\nبإبداع بصري متقن",
      heroSubEn: "Showcase your identity with strategic brand systems and photorealistic 3D product visuals crafted for impact.",
      heroSubAr: "أبرز هوية مشروعك بأنظمة بصرية متكاملة وتصميمات منتجات ثلاثية الأبعاد عالية الواقعية.",
      aboutBioEn: "Senior 2D & 3D Graphic Designer with extensive experience across the Egyptian and Saudi markets. Currently specializing as a 3D Designer, bringing strong creative vision and technical expertise to every brand and visual project.",
      aboutBioAr: "مصمم جرافيك أول ثنائي وثلاثي الأبعاد (Senior 2D & 3D Graphic Designer) بخبرة واسعة في السوق المصري والسعودي. أتخصص حالياً في التصميم ثلاثي الأبعاد والـ CGI وبناء الهويات البصرية، وأجمع بين الرؤية الفنية والخبرة التقنية في كل مشروع أعمل عليه.",
      aboutTitleEn: "Hello, I'm Mostafa Khaled",
      aboutTitleAr: "مرحباً، أنا مصطفى خالد",
      aboutStatusEn: "MK STUDIO • Available for Projects & Creative Direction",
      aboutStatusAr: "MK STUDIO • متاح للمشاريع والاستشارات الإبداعية",
      resumeTitleEn: "Mostafa Khaled — Senior 2D & 3D Designer",
      resumeTitleAr: "مصطفى خالد — مصمم جرافيك أول ومصمم 3D",
      resumeIntroEn: "Extensive creative leadership in brand identity systems, 3D product visualization, and photorealistic CGI across Saudi Arabia and Egypt.",
      resumeIntroAr: "خبرة واسعة في بناء الهويات البصرية وتصميم المنتجات ثلاثية الأبعاد والـ CGI للوكالات والشركات في المملكة العربية السعودية ومصر.",
      partnersTitleEn: "Brands That Trusted Our Visual Craft",
      partnersTitleAr: "علامات تجارية وثقت برؤيتنا الإبداعية",
      waNumber: "201002779252",
      waDisplay: "+20 100 277 9252",
      email: "Mkalwayzy@gmail.com",
      behanceUrl: "https://www.behance.net/Mkelwayzy",
      socialHandle: "Behance & Socials (@MKELWAYZY)",
      primaryColor: "#111214",
      bgColor: "#D9DADB",
      mutedColor: "#5A5C60",
      customLogoDataUrl: "",
      customLogoText: ""
    };

    let cmsConfig = { ...defaultCmsConfig };

    function getCmsStateSnapshot() {
      return {
        projectCoverAspectVersion: CMS_PROJECT_COVER_ASPECT_VERSION,
        config: { ...cmsConfig },
        projects: portfolioProjects,
        experience: experienceData,
        software: softwareList,
        education: educationData,
        expertise: expertiseTags,
        partners: partnersData,
        partnerSectors,
        partnerStats,
        resumeStats,
        aboutStats,
        aboutPillars,
        aboutTags
      };
    }

    function applyCmsState(parsed) {
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { repairedProjectIds: false, migratedProjectCoverAspects: false };
      }
      let repairedProjectIds = false;
      const migratedProjectCoverAspects = parsed.projectCoverAspectVersion !== CMS_PROJECT_COVER_ASPECT_VERSION;
      if (parsed.config && typeof parsed.config === "object" && !Array.isArray(parsed.config)) {
        const publicConfig = { ...parsed.config };
        delete publicConfig.passcode;
        cmsConfig = { ...defaultCmsConfig, ...publicConfig };
      }
      if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
        const validProjects = parsed.projects.filter((project) => project && typeof project === "object" && !Array.isArray(project));
        if (validProjects.length > 0) {
          const nextAvailableId = validProjects.reduce((max, project) => {
            const id = Number(project.id);
            return Number.isSafeInteger(id) && id > 0 ? Math.max(max, id) : max;
          }, 0) + 1;
          const usedIds = new Set();
          let nextId = nextAvailableId;
          portfolioProjects = validProjects.map((project) => {
            const id = Number(project.id);
            if (Number.isSafeInteger(id) && id > 0 && !usedIds.has(id)) {
              usedIds.add(id);
              return {
                ...project,
                id,
                ...(migratedProjectCoverAspects ? { coverAspect: "aspect-[3/4]" } : {})
              };
            }
            while (usedIds.has(nextId)) nextId += 1;
            repairedProjectIds = true;
            usedIds.add(nextId);
            return {
              ...project,
              id: nextId++,
              ...(migratedProjectCoverAspects ? { coverAspect: "aspect-[3/4]" } : {})
            };
          });
        }
      }
      if (Array.isArray(parsed.experience)) experienceData = parsed.experience;
      if (Array.isArray(parsed.software)) softwareList = parsed.software;
      if (parsed.education && typeof parsed.education === "object" && !Array.isArray(parsed.education)) {
        educationData = { ...educationData, ...parsed.education };
      }
      if (Array.isArray(parsed.expertise)) expertiseTags = parsed.expertise;
      if (Array.isArray(parsed.partners)) partnersData = parsed.partners;
      if (Array.isArray(parsed.partnerSectors)) partnerSectors = parsed.partnerSectors;
      if (Array.isArray(parsed.partnerStats)) partnerStats = parsed.partnerStats;
      if (Array.isArray(parsed.resumeStats)) resumeStats = parsed.resumeStats;
      if (Array.isArray(parsed.aboutStats)) aboutStats = parsed.aboutStats;
      if (Array.isArray(parsed.aboutPillars)) aboutPillars = parsed.aboutPillars;
      if (Array.isArray(parsed.aboutTags)) aboutTags = parsed.aboutTags;
      return { repairedProjectIds, migratedProjectCoverAspects };
    }

    function getDataUrlByteLength(dataUrl) {
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
      return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
    }

    async function uploadCmsDataUrl(dataUrl, onProgress) {
      if (!supabaseClient || !isAdminAuthenticated) {
        throw new Error("Sign in as an authorized administrator before uploading project files.");
      }
      const response = await fetch(dataUrl);
      if (!response.ok) throw new Error("Unable to read an uploaded project file.");
      const blob = await response.blob();
      if (!CMS_ALLOWED_IMAGE_TYPES.has(blob.type) && blob.type !== CMS_PROJECT_PDF_TYPE) {
        throw new Error("Use a JPEG, PNG, WebP, AVIF, GIF, SVG image, or PDF document.");
      }
      const extensions = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/svg+xml": "svg",
        "image/webp": "webp",
        "image/gif": "gif",
        "image/avif": "avif",
        [CMS_PROJECT_PDF_TYPE]: "pdf"
      };
      const maxSize = blob.type === CMS_PROJECT_PDF_TYPE ? CMS_PROJECT_PDF_MAX_BYTES : 15 * 1024 * 1024;
      if (blob.size > maxSize) {
        throw new Error(blob.type === CMS_PROJECT_PDF_TYPE
          ? "PDF files must be 100 MB or smaller."
          : "Images must be 15 MB or smaller.");
      }
      const extension = extensions[blob.type] || "img";
      const randomId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `${randomId}.${extension}`;
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session?.access_token) {
        throw new Error("Your administrator session expired. Sign in again before uploading project files.");
      }
      const uploadUrl = `${supabaseConfig.url.replace(/\/+$/, "")}/storage/v1/object/${encodeURIComponent(CMS_MEDIA_BUCKET)}/${encodeURIComponent(path)}`;
      await new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.timeout = 60000;
        request.open("POST", uploadUrl);
        request.setRequestHeader("apikey", supabaseConfig.publishableKey);
        request.setRequestHeader("Authorization", `Bearer ${sessionData.session.access_token}`);
        request.setRequestHeader("Content-Type", blob.type);
        request.setRequestHeader("cache-control", "max-age=31536000");
        request.setRequestHeader("x-upsert", "false");
        request.upload.addEventListener("progress", (event) => {
          if (onProgress) onProgress(event.loaded, event.lengthComputable ? event.total : blob.size);
        });
        request.addEventListener("load", () => {
          if (request.status >= 200 && request.status < 300) {
            resolve();
            return;
          }
          let response = {};
          try {
            response = JSON.parse(request.responseText);
          } catch {
            // Use the HTTP status when Storage returns a non-JSON error.
          }
          reject(new Error(response.message || response.error || `Project file upload failed (HTTP ${request.status}).`));
        });
        request.addEventListener("error", () => reject(new Error("Network error while uploading a project file.")));
        request.addEventListener("abort", () => reject(new Error("Project file upload was cancelled.")));
        request.addEventListener("timeout", () => reject(new Error("Project file upload timed out. Try a smaller image or a stronger connection.")));
        request.send(blob);
      });
      const { data } = supabaseClient.storage.from(CMS_MEDIA_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    }

    async function uploadCmsPdfFile(file, path, onProgress) {
      if (!supabaseClient || !isAdminAuthenticated) {
        throw new Error("Sign in as an authorized administrator before uploading project files.");
      }
      if (!window.tus?.Upload) {
        throw new Error("The resumable upload component could not load. Check your connection and reload the page.");
      }
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session?.access_token) {
        throw new Error("Your administrator session expired. Sign in again before uploading project files.");
      }

      const uploadUrl = `${supabaseConfig.url.replace(/\/+$/, "")}/storage/v1/upload/resumable`;
      await new Promise((resolve, reject) => {
        const upload = new window.tus.Upload(file, {
          endpoint: uploadUrl,
          chunkSize: 6 * 1024 * 1024,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          headers: {
            authorization: `Bearer ${sessionData.session.access_token}`,
            apikey: supabaseConfig.publishableKey,
            "x-upsert": "false"
          },
          metadata: {
            bucketName: CMS_MEDIA_BUCKET,
            objectName: path,
            contentType: CMS_PROJECT_PDF_TYPE,
            cacheControl: "31536000"
          },
          onError: reject,
          onProgress: (bytesUploaded, bytesTotal) => {
            if (onProgress) onProgress(bytesUploaded, bytesTotal);
          },
          onSuccess: resolve
        });
        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0]);
          upload.start();
        }).catch(reject);
      });

      const { data } = supabaseClient.storage.from(CMS_MEDIA_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    }

    async function prepareCmsStateForRemote(onUploadProgress) {
      const snapshot = JSON.parse(JSON.stringify(getCmsStateSnapshot()));
      const uploadedFiles = new Map();
      const mediaDataUrls = new Set();
      const collectMedia = (value) => {
        if (typeof value === "string" && (value.startsWith("data:image/") || value.startsWith("data:application/pdf;"))) {
          mediaDataUrls.add(value);
        }
      };
      collectMedia(snapshot.config.customLogoDataUrl);
      for (const project of snapshot.projects) {
        collectMedia(project.imageUrl);
        collectMedia(project.pdfUrl);
        if (Array.isArray(project.pdfFiles)) project.pdfFiles.forEach((pdf) => collectMedia(pdf?.url));
        if (Array.isArray(project.gallery)) project.gallery.forEach(collectMedia);
        if (Array.isArray(project.mediaBlocks)) project.mediaBlocks.forEach((block) => collectMedia(block.url));
      }

      const totalBytes = Array.from(mediaDataUrls).reduce((sum, dataUrl) => sum + getDataUrlByteLength(dataUrl), 0);
      let completedBytes = 0;
      let fileIndex = 0;
      for (const dataUrl of mediaDataUrls) {
        fileIndex += 1;
        const imageSize = getDataUrlByteLength(dataUrl);
        if (onUploadProgress) {
          onUploadProgress({
            loaded: completedBytes,
            total: totalBytes,
            fileIndex,
            fileCount: mediaDataUrls.size
          });
        }
        uploadedFiles.set(dataUrl, await uploadCmsDataUrl(dataUrl, (loaded) => {
          if (onUploadProgress) {
            onUploadProgress({
              loaded: completedBytes + loaded,
              total: totalBytes,
              fileIndex,
              fileCount: mediaDataUrls.size
            });
          }
        }));
        completedBytes += imageSize;
      }

      const prepareMedia = (value) => uploadedFiles.get(value) || value;
      snapshot.config.customLogoDataUrl = prepareMedia(snapshot.config.customLogoDataUrl);
      for (const project of snapshot.projects) {
        project.imageUrl = prepareMedia(project.imageUrl);
        project.pdfUrl = prepareMedia(project.pdfUrl);
        if (Array.isArray(project.pdfFiles)) {
          project.pdfFiles = project.pdfFiles.map((pdf) => ({
            ...pdf,
            url: prepareMedia(pdf?.url)
          }));
        }
        if (Array.isArray(project.gallery)) project.gallery = project.gallery.map(prepareMedia);
        if (Array.isArray(project.mediaBlocks)) {
          project.mediaBlocks = project.mediaBlocks.map((block) => ({
            ...block,
            url: prepareMedia(block.url)
          }));
        }
      }
      if (mediaDataUrls.size && onUploadProgress) {
        onUploadProgress({ loaded: totalBytes, total: totalBytes, fileIndex: mediaDataUrls.size, fileCount: mediaDataUrls.size, saving: true });
      }
      return snapshot;
    }

    async function saveCmsState(onUploadProgress) {
      lastCmsSaveError = "";
      if (!supabaseClient) {
        lastCmsSaveError = "Supabase is not configured.";
        showCmsToast(`${lastCmsSaveError} Portfolio changes were not published.`);
        return false;
      }
      if (!isAdminAuthenticated) {
        lastCmsSaveError = "Sign in as an authorized administrator before publishing changes.";
        showCmsToast(lastCmsSaveError);
        return false;
      }
      if (!cmsRemoteStateLoaded) {
        lastCmsSaveError = "Portfolio content could not be verified online. Reload before publishing to avoid overwriting existing content.";
        showCmsToast(lastCmsSaveError);
        return false;
      }
      try {
        const content = await Promise.race([
          prepareCmsStateForRemote(onUploadProgress),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Publishing timed out. Check the image sizes and network connection.")), 90000);
          })
        ]);
        const { error } = await supabaseClient
          .from(CMS_CONTENT_TABLE)
          .upsert({ id: 1, content, updated_at: new Date().toISOString() }, { onConflict: "id" });
        if (error) throw error;
        applyCmsState(content);
        cmsRemoteStateExists = true;
        try {
          localStorage.removeItem(CMS_STORAGE_KEY);
        } catch (cacheError) {
          console.error("Unable to clear the old local portfolio cache after publishing.", cacheError);
        }
        return true;
      } catch (error) {
        console.error("Unable to publish portfolio changes to Supabase.", error);
        lastCmsSaveError = getCmsErrorMessage(error, "Supabase request failed.");
        showCmsToast(`Changes could not be published: ${lastCmsSaveError}`);
        return false;
      }
    }

    async function loadCmsState() {
      cmsRemoteStateLoaded = false;
      try {
        const raw = localStorage.getItem(CMS_STORAGE_KEY);
        if (raw) applyCmsState(JSON.parse(raw));
      } catch (error) {
        console.error("Unable to load the previous local portfolio cache.", error);
      }

      if (!supabaseClient) {
        console.error("Supabase is unavailable; portfolio content is limited to this browser's saved cache.");
        showCmsToast("Supabase is unavailable. Showing default or previously cached content.");
        return false;
      }

      try {
        const { data, error } = await supabaseClient
          .from(CMS_CONTENT_TABLE)
          .select("content")
          .eq("id", 1)
          .maybeSingle();
        if (error) throw error;
        cmsRemoteStateLoaded = true;
        cmsRemoteStateExists = Boolean(data);
        if (data?.content) {
          const stateChanges = applyCmsState(data.content);
          if (stateChanges.repairedProjectIds) {
            console.warn("Duplicate or invalid project IDs were reassigned to keep project records distinct.");
          }
          if (stateChanges.migratedProjectCoverAspects) {
            console.info("Legacy project cover proportions were updated to portrait 3:4.");
          }
          if (stateChanges.repairedProjectIds || stateChanges.migratedProjectCoverAspects) {
            const saved = isAdminAuthenticated && await saveCmsState();
            if (saved && stateChanges.migratedProjectCoverAspects) {
              showCmsToast("Project cover proportions were synchronized and published.");
            } else if (saved && stateChanges.repairedProjectIds) {
              showCmsToast("Duplicate project IDs were corrected and published.");
            } else if (!isAdminAuthenticated && stateChanges.migratedProjectCoverAspects) {
              showCmsToast("Project covers now display in portrait 3:4; sign in as an admin to sync the change online.");
            } else if (!isAdminAuthenticated && stateChanges.repairedProjectIds) {
              showCmsToast("Duplicate project IDs were corrected for display; sign in to publish the correction.");
            }
          }
        }
        return true;
      } catch (error) {
        console.error("Unable to load portfolio content from Supabase.", error);
        showCmsToast("Online content could not be loaded. Showing default or previously cached content.");
        return false;
      }
    }

    async function isSupabaseAdmin(userId) {
      const { data, error } = await supabaseClient
        .from("portfolio_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    }

    async function restoreAdminSession() {
      if (!supabaseClient) return;
      try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        if (!data.session) return;
        if (!await isSupabaseAdmin(data.session.user.id)) {
          const { error: signOutError } = await supabaseClient.auth.signOut();
          if (signOutError) throw signOutError;
          return;
        }
        isAdminAuthenticated = true;
      } catch (error) {
        console.error("Unable to restore the Supabase administrator session.", error);
        showCmsToast("Admin session could not be verified. Sign in again after completing the Supabase setup.");
        try {
          const { error: signOutError } = await supabaseClient.auth.signOut();
          if (signOutError) console.error("Unable to clear the unverified Supabase session.", signOutError);
        } catch (signOutError) {
          console.error("Unable to clear the unverified Supabase session.", signOutError);
        }
      }
    }

    function showCmsToast(msg) {
      const banner = document.getElementById("cmsToastBanner");
      const text = document.getElementById("cmsToastText");
      if (!banner || !text) return;
      text.textContent = msg;
      banner.classList.remove("hidden");
      setTimeout(() => banner.classList.add("hidden"), 3200);
    }

    function setCmsProjectPublishStatus(state, message = "") {
      const status = document.getElementById("cmsProjectPublishStatus");
      const icon = document.getElementById("cmsProjectPublishStatusIcon");
      const text = document.getElementById("cmsProjectPublishStatusText");
      if (!status || !icon || !text) return;
      if (!state) {
        status.classList.add("hidden");
        status.classList.remove("flex");
        return;
      }

      const styles = {
        pending: ["#eff6ff", "#1e40af", "…"],
        success: ["#f0fdf4", "#166534", "✓"],
        error: ["#fef2f2", "#991b1b", "✕"]
      };
      const style = styles[state];
      if (!style) return;
      const [backgroundColor, textColor, symbol] = style;
      status.classList.remove("hidden");
      status.classList.add("flex");
      status.style.backgroundColor = backgroundColor;
      status.style.color = textColor;
      icon.textContent = symbol;
      text.textContent = message;
    }

    function getCmsErrorMessage(error, fallback) {
      if (typeof error === "string" && error.trim()) return error;
      if (typeof error?.message === "string" && error.message.trim()) return error.message;
      return fallback;
    }

    function applyCmsThemeAndContact() {
      // Apply Brand Colors via CSS Variables
      document.documentElement.style.setProperty("--brand-primary", cmsConfig.primaryColor || "#111214");
      document.documentElement.style.setProperty("--brand-bg", cmsConfig.bgColor || "#D9DADB");
      document.documentElement.style.setProperty("--brand-muted", cmsConfig.mutedColor || "#5A5C60");

      // Apply Custom Logo or Default Signature SVG
      const customWrap = document.getElementById("customLogoWrapper");
      const customImg = document.getElementById("customLogoImg");
      const customTxt = document.getElementById("customLogoText");
      const sigSvg = document.getElementById("defaultSignatureSvg");

      if (cmsConfig.customLogoDataUrl && customWrap && customImg && sigSvg) {
        customImg.src = cmsConfig.customLogoDataUrl;
        if (customTxt) customTxt.textContent = cmsConfig.customLogoText || "";
        customWrap.classList.remove("hidden");
        customWrap.classList.add("flex");
        sigSvg.classList.add("hidden");
      } else if (customWrap && sigSvg) {
        customWrap.classList.add("hidden");
        customWrap.classList.remove("flex");
        sigSvg.classList.remove("hidden");
      }

      // Apply Contact Details to Modal
      const waLink = document.getElementById("contactWaLink");
      const waDisp = document.getElementById("contactWaDisplay");
      const emLink = document.getElementById("contactEmailLink");
      const emDisp = document.getElementById("contactEmailDisplay");
      const beLink = document.getElementById("contactBeLink");
      const beTitle = document.getElementById("contactBeTitle");
      const beDisp = document.getElementById("contactBeDisplay");

      if (waLink) waLink.href = `https://wa.me/${cmsConfig.waNumber}`;
      if (waDisp) waDisp.textContent = cmsConfig.waDisplay;
      if (emLink) emLink.href = `mailto:${cmsConfig.email}`;
      if (emDisp) emDisp.textContent = cmsConfig.email;
      if (beLink) beLink.href = cmsConfig.behanceUrl;
      if (beTitle) beTitle.textContent = cmsConfig.socialHandle;
      if (beDisp) beDisp.textContent = cmsConfig.behanceUrl.replace(/^https?:\/\/(www\.)?/, "");

      // Admin active indicator dot on header button
      const adminDot = document.getElementById("adminActiveDot");
      if (adminDot) {
        if (isAdminAuthenticated) adminDot.classList.remove("hidden");
        else adminDot.classList.add("hidden");
      }
    }

    function openAdminLoginModal() {
      if (isAdminAuthenticated) {
        switchPage("admin");
        return;
      }
      const modal = document.getElementById("adminLoginModal");
      if (!modal) return;
      modal.classList.remove("hidden");
      requestAnimationFrame(() => modal.classList.remove("opacity-0"));
    }

    function closeAdminLoginModal() {
      const modal = document.getElementById("adminLoginModal");
      if (!modal) return;
      modal.classList.add("opacity-0");
      setTimeout(() => modal.classList.add("hidden"), 250);
    }

    async function applyCmsPresetTheme(primary, bg, muted) {
      cmsConfig.primaryColor = primary;
      cmsConfig.bgColor = bg;
      cmsConfig.mutedColor = muted;
      const pIn = document.getElementById("cmsColorPrimary");
      const bIn = document.getElementById("cmsColorBg");
      const mIn = document.getElementById("cmsColorMuted");
      if (pIn) pIn.value = primary;
      if (bIn) bIn.value = bg;
      if (mIn) mIn.value = muted;
      document.getElementById("cmsColorPrimaryHex").textContent = primary;
      document.getElementById("cmsColorBgHex").textContent = bg;
      document.getElementById("cmsColorMutedHex").textContent = muted;
      applyCmsThemeAndContact();
      if (await saveCmsState()) showCmsToast("Theme colors updated!");
    }

    // ==================== PROJECT IMAGE GALLERY ====================
    let cmsDraftBlocks = [];
    let cmsDraftFreeformGallery = true;
    let cmsDraftGalleryChanged = false;
    let cmsDraftPdfs = [];
    let cmsProjectPdfUploadActive = false;
    let cmsCoverReadPending = false;
    let cmsCoverReadVersion = 0;
    let cmsProjectOrderSaving = false;

    function getCmsProjectCountry(project) {
      const location = `${project.location || ""} ${project.locationAr || ""}`.toLowerCase();
      if (location.includes("egypt") || location.includes("مصر")) return "Egypt";
      if (location.includes("saudi") || location.includes("السعودية") || location.includes("سعودية")) return "Saudi Arabia";
      if (location.includes("kuwait") || location.includes("الكويت")) return "Kuwait";
      if (location.includes("oman") || location.includes("عمان") || location.includes("عُمان")) return "Oman";
      return "";
    }

    function populateCmsProjectYearOptions(selectedYear = new Date().getFullYear()) {
      const yearSelect = document.getElementById("cmsProjYear");
      if (!yearSelect) return;
      const currentYear = new Date().getFullYear();
      const latestYear = Math.max(currentYear + 5, Number(selectedYear) || currentYear);
      yearSelect.innerHTML = '<option value="">اختر السنة / Select year</option>' + Array.from({ length: latestYear - 2018 + 1 }, (_, index) => {
        const year = 2018 + index;
        return `<option value="${year}">${year}</option>`;
      }).join("");
      yearSelect.value = String(selectedYear);
      if (!yearSelect.value) yearSelect.value = String(currentYear);
    }

    function setCmsProjectTools(selectedTools = []) {
      const normalizedTools = selectedTools.map((tool) => tool.toLowerCase().replace(/^adobe\s+/, "").replace(/\s+3d$/, "").trim());
      document.querySelectorAll('input[name="cmsProjTools"]').forEach((checkbox) => {
        const value = checkbox.value.toLowerCase();
        checkbox.checked = normalizedTools.some((tool) => tool === value || (value === "comfy" && tool.includes("comfy")));
      });
    }

    function getSelectedCmsProjectTools() {
      return Array.from(document.querySelectorAll('input[name="cmsProjTools"]:checked'), (checkbox) => checkbox.value);
    }

    function createDefaultMediaBlock(url = "", captionEn = "", captionAr = "", index = cmsDraftBlocks.length) {
      return {
        uid: "blk_" + Math.random().toString(36).slice(2, 9),
        url,
        aspect: "aspect-auto",
        x: index % 2 === 0 ? 0 : 6,
        y: Math.floor(index / 2) * 6,
        width: 6,
        height: 6,
        fit: "cover",
        captionEn,
        captionAr
      };
    }

    function normalizeCmsMediaAspect(aspect) {
      return CMS_MEDIA_ASPECTS.includes(aspect) ? aspect : "aspect-auto";
    }

    function normalizeCmsMediaLayout(block, index = 0) {
      const defaultX = index % 2 === 0 ? 0 : 6;
      const defaultY = Math.floor(index / 2) * 6;
      const width = Math.max(1, Math.min(12, Number(block.width) || 6));
      const height = Math.max(1, Math.min(120, Number(block.height) || 6));
      const x = Math.max(0, Math.min(12 - width, Number.isFinite(Number(block.x)) ? Number(block.x) : defaultX));
      const y = Math.max(0, Math.min(120 - height, Number.isFinite(Number(block.y)) ? Number(block.y) : defaultY));
      return {
        x,
        y,
        width,
        height,
        fit: block.fit === "contain" ? "contain" : (block.fit === "cover" ? "cover" : (block.aspect === "aspect-auto" ? "contain" : "cover"))
      };
    }

    function getCmsMediaCanvasRows() {
      return Math.max(12, ...cmsDraftBlocks.map((block, index) => {
        const layout = normalizeCmsMediaLayout(block, index);
        return Math.ceil(layout.y + layout.height);
      }));
    }

    function updateCmsMediaCanvasLayout(container) {
      const rows = getCmsMediaCanvasRows();
      container.style.setProperty("--cms-canvas-rows", String(rows));
      container.style.aspectRatio = `12 / ${rows}`;
      cmsDraftBlocks.forEach((block, index) => {
        const tile = container.querySelector(`[data-block-uid="${CSS.escape(block.uid)}"]`);
        if (!tile) return;
        const layout = normalizeCmsMediaLayout(block, index);
        tile.style.left = `${(layout.x / 12) * 100}%`;
        tile.style.top = `${(layout.y / rows) * 100}%`;
        tile.style.width = `${(layout.width / 12) * 100}%`;
        tile.style.height = `${(layout.height / rows) * 100}%`;
        tile.style.zIndex = String(index + 1);
      });
    }

    function renderCmsMediaBlocksEditor() {
      const container = document.getElementById("cmsMediaBlocksContainer");
      if (!container) return;
      const isAr = currentLang === "ar";
      updateCmsMediaEditorDescription();

      if (!cmsDraftFreeformGallery) {
        container.className = "grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3";
        container.style.removeProperty("aspect-ratio");
        container.style.removeProperty("--cms-canvas-rows");
        if (cmsDraftBlocks.length === 0) {
          container.innerHTML = `
            <div class="rounded-2xl border border-dashed border-black/15 bg-white/40 p-6 text-center sm:col-span-2 lg:col-span-3">
              <p class="text-xs font-semibold text-obsidian">${isAr ? "لم يتم اختيار صور للمشروع بعد." : "No project images selected."}</p>
            </div>
          `;
          return;
        }
        container.innerHTML = cmsDraftBlocks.map((block, index) => {
          const aspect = normalizeCmsMediaAspect(block.aspect);
          const imageClass = aspect === "aspect-auto" ? "w-full h-auto object-contain" : "w-full h-full object-cover";
          const options = CMS_MEDIA_ASPECTS.map((value) => {
            const labels = {
              "aspect-auto": isAr ? "الأبعاد الأصلية" : "Original proportions",
              "aspect-[4/3]": "4:3",
              "aspect-video": "16:9",
              "aspect-square": isAr ? "مربع 1:1" : "Square 1:1",
              "aspect-[3/4]": isAr ? "طولي 3:4" : "Portrait 3:4",
              "aspect-[21/9]": "21:9"
            };
            return `<option value="${value}" ${aspect === value ? "selected" : ""}>${labels[value]}</option>`;
          }).join("");
          return `
            <article class="cms-media-block min-w-0 rounded-2xl border border-white bg-white/80 p-3.5 shadow-sm" data-block-uid="${escapeCmsHtml(block.uid)}">
              <div class="flex items-center justify-between gap-2">
                <span class="rounded-full bg-obsidian px-2.5 py-0.5 text-[10px] font-bold text-white">${isAr ? "صورة" : "Image"} #${index + 1}</span>
                <div class="flex items-center gap-1">
                  <button type="button" data-legacy-media-action="up" data-media-index="${index}" ${index === 0 ? "disabled" : ""} class="rounded-lg bg-black/5 px-2 py-1 text-[10px] font-bold text-obsidian disabled:opacity-30" aria-label="${isAr ? "تحريك الصورة لأعلى" : "Move image up"}">↑</button>
                  <button type="button" data-legacy-media-action="down" data-media-index="${index}" ${index === cmsDraftBlocks.length - 1 ? "disabled" : ""} class="rounded-lg bg-black/5 px-2 py-1 text-[10px] font-bold text-obsidian disabled:opacity-30" aria-label="${isAr ? "تحريك الصورة لأسفل" : "Move image down"}">↓</button>
                  <button type="button" data-legacy-media-action="remove" data-media-index="${index}" class="rounded-lg bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-700">${isAr ? "حذف" : "Remove"}</button>
                </div>
              </div>
              ${block.url
                ? `<div class="mt-3 overflow-hidden rounded-xl border border-black/10 bg-black/5 ${aspect}" data-legacy-preview><img src="${escapeCmsHtml(block.url)}" alt="${isAr ? "صورة المشروع" : "Project image"} ${index + 1}" loading="lazy" decoding="async" class="${imageClass}" /></div>`
                : `<div class="mt-3 flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-black/10 bg-black/5 p-6"><span data-image-read-progress-text class="text-xs font-semibold text-slateText">${isAr ? "جارٍ قراءة الصورة" : "Reading image"}… ${Math.round(block.readProgress || 0)}%</span><div class="h-2 w-full max-w-md overflow-hidden rounded-full bg-black/10" role="progressbar" aria-valuenow="${Math.round(block.readProgress || 0)}" aria-valuemin="0" aria-valuemax="100"><div data-image-read-progress-bar class="h-full rounded-full bg-obsidian transition-[width] duration-150" style="width:${Math.round(block.readProgress || 0)}%"></div></div></div>`}
              <label class="mt-3 block text-[10px] font-semibold text-obsidian">${isAr ? "نسبة عرض الصورة" : "Image aspect ratio"}
                <select data-legacy-media-aspect="${index}" class="mt-1 w-full rounded-lg px-2.5 py-2 text-[11px]">${options}</select>
              </label>
            </article>
          `;
        }).join("");
        container.querySelectorAll("[data-legacy-media-aspect]").forEach((select) => {
          select.addEventListener("change", () => {
            const index = Number(select.dataset.legacyMediaAspect);
            const block = cmsDraftBlocks[index];
            if (!block) return;
            block.aspect = normalizeCmsMediaAspect(select.value);
            cmsDraftGalleryChanged = true;
            renderCmsMediaBlocksEditor();
          });
        });
        container.querySelectorAll("[data-legacy-media-action]").forEach((button) => {
          button.addEventListener("click", () => {
            const index = Number(button.dataset.mediaIndex);
            const action = button.dataset.legacyMediaAction;
            if (action === "remove") removeCmsMediaBlock(index);
            else moveCmsMediaBlock(index, action === "up" ? -1 : 1);
          });
        });
        return;
      }

      container.className = "cms-layout-canvas";
      if (cmsDraftBlocks.length === 0) {
        container.innerHTML = `
        <div class="cms-layout-empty rounded-2xl border border-dashed border-black/15 bg-white/40 p-6 text-center">
            <p class="text-xs font-semibold text-obsidian">${isAr ? "لم يتم اختيار صور للمشروع بعد." : "No project images selected."}</p>
          <p class="text-[11px] text-slateText mt-1">${isAr ? "أضف صورًا ثم اسحبها إلى مواضعها، واستخدم مقبض الزاوية لتغيير حجمها." : "Add images, drag them into place, and use the corner handle to resize them."}</p>
          </div>
        `;
        return;
      }

      const canvasRows = getCmsMediaCanvasRows();
      container.innerHTML = cmsDraftBlocks.map((blk, idx) => {
        const layout = normalizeCmsMediaLayout(blk, idx);
        return `
        <article class="cms-layout-tile" data-media-block data-block-uid="${escapeCmsHtml(blk.uid)}" tabindex="0" aria-label="${isAr ? "صورة" : "Image"} ${idx + 1}. ${isAr ? "استخدم الأسهم للتحريك وShift مع الأسهم لتغيير الحجم." : "Use arrow keys to move; hold Shift to resize."}" style="left:${(layout.x / 12) * 100}%;top:${(layout.y / canvasRows) * 100}%;width:${(layout.width / 12) * 100}%;height:${(layout.height / canvasRows) * 100}%;z-index:${idx + 1}">
          ${blk.url
            ? `<img src="${escapeCmsHtml(blk.url)}" alt="${isAr ? "صورة المشروع" : "Project image"} ${idx + 1}" loading="lazy" decoding="async" style="object-fit:${layout.fit}" />`
            : `<div class="cms-layout-reading"><span data-image-read-progress-text>${isAr ? "جارٍ قراءة الصورة" : "Reading image"}… ${Math.round(blk.readProgress || 0)}%</span><div class="cms-layout-progress" role="progressbar" aria-valuenow="${Math.round(blk.readProgress || 0)}" aria-valuemin="0" aria-valuemax="100"><span data-image-read-progress-bar style="width:${Math.round(blk.readProgress || 0)}%"></span></div></div>`}
          <span class="cms-layout-number">${idx + 1}</span>
          <button type="button" data-media-remove="${idx}" aria-label="${isAr ? "حذف الصورة" : "Remove image"} ${idx + 1}" class="cms-layout-remove" data-media-control>×</button>
          <label class="cms-layout-fit">
            <span>${isAr ? "طريقة العرض" : "Display"}</span>
            <select data-media-fit="${idx}" aria-label="${isAr ? "طريقة عرض الصورة" : "Image display mode"}" data-media-control>
              <option value="cover" ${layout.fit === "cover" ? "selected" : ""}>${isAr ? "ملء مع قص" : "Fill / crop"}</option>
              <option value="contain" ${layout.fit === "contain" ? "selected" : ""}>${isAr ? "الصورة كاملة" : "Show full image"}</option>
            </select>
          </label>
          <span data-media-resize aria-hidden="true" class="cms-layout-resize" data-media-control></span>
        </article>
      `;
      }).join("");

      updateCmsMediaCanvasLayout(container);
      container.querySelectorAll("[data-media-fit]").forEach((select) => {
        select.addEventListener("change", () => {
          const index = Number(select.dataset.mediaFit);
          const block = cmsDraftBlocks[index];
          if (!block) return;
          block.fit = select.value === "contain" ? "contain" : "cover";
          cmsDraftGalleryChanged = true;
          const image = select.closest("[data-media-block]")?.querySelector("img");
          if (image) image.style.objectFit = block.fit;
        });
      });
      container.querySelectorAll("[data-media-remove]").forEach((button) => {
        button.addEventListener("click", () => {
          removeCmsMediaBlock(Number(button.dataset.mediaRemove));
        });
      });

      container.querySelectorAll("[data-media-block]").forEach((tile) => {
        tile.addEventListener("pointerdown", (event) => {
          if (event.button !== 0 || event.target.closest("[data-media-control]")) return;
          startCmsMediaTransform(event, tile, "move");
        });
        tile.addEventListener("keydown", (event) => {
          if (event.target !== tile || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
          event.preventDefault();
          const index = cmsDraftBlocks.findIndex((item) => item.uid === tile.dataset.blockUid);
          const block = cmsDraftBlocks[index];
          if (!block) return;
          const layout = normalizeCmsMediaLayout(block, index);
          const direction = event.key === "ArrowLeft" ? [-1, 0] : event.key === "ArrowRight" ? [1, 0] : event.key === "ArrowUp" ? [0, -1] : [0, 1];
          if (event.shiftKey) {
            block.width = Math.max(1, Math.min(12 - layout.x, layout.width + direction[0]));
            block.height = Math.max(1, Math.min(120 - layout.y, layout.height + direction[1]));
          } else {
            block.x = Math.max(0, Math.min(12 - layout.width, layout.x + direction[0]));
            block.y = Math.max(0, Math.min(120 - layout.height, layout.y + direction[1]));
          }
          cmsDraftGalleryChanged = true;
          renderCmsMediaBlocksEditor();
          container.querySelector(`[data-block-uid="${CSS.escape(block.uid)}"]`)?.focus();
        });
        tile.querySelector("[data-media-resize]")?.addEventListener("pointerdown", (event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          startCmsMediaTransform(event, tile, "resize");
        });
      });
    }

    function startCmsMediaTransform(event, tile, mode) {
      const blockIndex = cmsDraftBlocks.findIndex((item) => item.uid === tile.dataset.blockUid);
      const block = cmsDraftBlocks[blockIndex];
      const container = document.getElementById("cmsMediaBlocksContainer");
      if (!block || !container) return;
      const layout = normalizeCmsMediaLayout(block, blockIndex);
      const rows = getCmsMediaCanvasRows();
      const cellWidth = container.clientWidth / 12;
      const cellHeight = container.clientHeight / rows;
      const startX = event.clientX;
      const startY = event.clientY;
      const initialX = layout.x;
      const initialY = layout.y;
      const initialWidth = layout.width;
      const initialHeight = layout.height;
      tile.setPointerCapture(event.pointerId);
      tile.classList.add("is-transforming");
      event.preventDefault();

      const finish = () => {
        tile.removeEventListener("pointermove", move);
        tile.removeEventListener("pointerup", finish);
        tile.removeEventListener("pointercancel", finish);
        tile.classList.remove("is-transforming");
        renderCmsMediaBlocksEditor();
      };
      const move = (pointerEvent) => {
        const columns = (pointerEvent.clientX - startX) / cellWidth;
        const movedRows = (pointerEvent.clientY - startY) / cellHeight;
        if (mode === "resize") {
          block.width = Math.max(1, Math.min(12 - initialX, initialWidth + columns));
          block.height = Math.max(1, Math.min(120 - initialY, initialHeight + movedRows));
        } else {
          block.x = Math.max(0, Math.min(12 - layout.width, initialX + columns));
          block.y = Math.max(0, Math.min(120 - layout.height, initialY + movedRows));
        }
        cmsDraftGalleryChanged = true;
        updateCmsMediaCanvasLayout(container);
      };
      tile.addEventListener("pointermove", move);
      tile.addEventListener("pointerup", finish, { once: true });
      tile.addEventListener("pointercancel", finish, { once: true });
    }

    function removeCmsMediaBlock(idx) {
      cmsDraftBlocks.splice(idx, 1);
      cmsDraftGalleryChanged = true;
      renderCmsMediaBlocksEditor();
    }

    function moveCmsMediaBlock(idx, direction) {
      const destination = Math.max(0, Math.min(cmsDraftBlocks.length - 1, idx + direction));
      if (destination === idx) return;
      const [block] = cmsDraftBlocks.splice(idx, 1);
      cmsDraftBlocks.splice(destination, 0, block);
      cmsDraftGalleryChanged = true;
      renderCmsMediaBlocksEditor();
    }

    function validateCmsImageFile(file) {
      if (!CMS_ALLOWED_IMAGE_TYPES.has(file.type)) {
        showCmsToast("Choose a JPEG, PNG, WebP, AVIF, GIF, or SVG image.");
        return false;
      }
      if (file.size === 0) {
        showCmsToast("The selected image file is empty.");
        return false;
      }
      if (file.size > 15 * 1024 * 1024) {
        showCmsToast("Images must be 15 MB or smaller.");
        return false;
      }
      return true;
    }

    function validateCmsPdfFile(file) {
      const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
      if ((file.type && file.type !== CMS_PROJECT_PDF_TYPE) || (!file.type && !hasPdfExtension)) {
        showCmsToast("Choose a PDF document.");
        return false;
      }
      if (file.size === 0) {
        showCmsToast("The selected PDF file is empty.");
        return false;
      }
      if (file.size > CMS_PROJECT_PDF_MAX_BYTES) {
        showCmsToast("PDF files must be 100 MB or smaller.");
        return false;
      }
      return true;
    }

    async function compressCmsImageFile(file) {
      if (!file || !file.type || !file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
      if (file.size <= 2 * 1024 * 1024) return file;
      try {
        const imageBitmap = await createImageBitmap(file);
        const maxSide = 1800;
        const scale = Math.min(1, maxSide / Math.max(imageBitmap.width, imageBitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(imageBitmap.width * scale));
        canvas.height = Math.max(1, Math.round(imageBitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context) return file;
        context.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
        const compressedBlob = await new Promise((resolve) => {
          canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", file.size > 6 * 1024 * 1024 ? 0.72 : 0.82);
        });
        imageBitmap.close?.();
        return compressedBlob instanceof Blob ? compressedBlob : file;
      } catch (error) {
        console.warn("Could not compress the project image before publishing.", error);
        return file;
      }
    }

    function readCmsFileAsDataUrl(file, onProgress) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("progress", (event) => {
          if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
        });
        reader.addEventListener("load", () => {
          if (typeof reader.result === "string") resolve(reader.result);
          else reject(new Error("Unable to read the selected file."));
        });
        reader.addEventListener("error", () => reject(reader.error || new Error("Unable to read the selected file.")));
        reader.addEventListener("abort", () => reject(new Error("File reading was cancelled.")));
        reader.readAsDataURL(file);
      });
    }

    function renderCmsProjectPdfs() {
      const container = document.getElementById("cmsProjectPdfList");
      const status = document.getElementById("cmsProjectPdfStatus");
      if (!container || !status) return;
      const fileInput = document.getElementById("cmsProjPdfFile");
      if (fileInput) fileInput.disabled = cmsProjectPdfUploadActive;
      const cancelButton = document.getElementById("cmsCancelEditProjectBtn");
      if (cancelButton) cancelButton.disabled = cmsProjectPdfUploadActive;
      const publishButton = document.getElementById("cmsPublishProjectPdfsBtn");
      if (publishButton) {
        publishButton.classList.toggle("hidden", !document.getElementById("cmsEditProjectId").value);
        publishButton.disabled = cmsProjectPdfUploadActive;
      }
      const isEditingProject = Boolean(document.getElementById("cmsEditProjectId").value);
      status.textContent = cmsDraftPdfs.length
        ? `${cmsDraftPdfs.length} PDF${cmsDraftPdfs.length === 1 ? "" : "s"} selected. ${isEditingProject ? "Save PDF changes to this project, or update the full project below." : "PDFs upload when you publish the project below."}`
        : "No PDFs attached.";
      container.innerHTML = cmsDraftPdfs.map((pdf, index) => {
        const isPending = pdf.file instanceof File;
        const validUrl = typeof pdf.url === "string" && /^https?:\/\//i.test(pdf.url);
        const sizeLabel = pdf.size ? `${(pdf.size / (1024 * 1024)).toFixed(1)} MB` : "PDF";
        return `
          <article class="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-black/5 bg-white/75 p-3">
            <div class="min-w-0">
              <p class="truncate text-[11px] font-semibold text-obsidian" title="${escapeCmsHtml(pdf.name || `Project document ${index + 1}`)}">${escapeCmsHtml(pdf.name || `Project document ${index + 1}`)}</p>
              <p class="mt-1 text-[10px] text-slateText">${isPending ? "Ready to upload" : (pdf.pending ? "Uploaded — publish to attach" : "Published")} · ${sizeLabel}</p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              ${validUrl ? `<a href="${escapeCmsHtml(pdf.url)}" target="_blank" rel="noopener noreferrer" class="rounded-full bg-black/5 px-2.5 py-1.5 text-[10px] font-semibold text-obsidian hover:bg-black/10">Open</a>` : ""}
              <button type="button" data-pdf-remove="${index}" aria-label="Remove ${escapeCmsHtml(pdf.name || `PDF ${index + 1}`)}" ${cmsProjectPdfUploadActive ? "disabled" : ""} class="rounded-full bg-red-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-red-700 hover:bg-red-500/20 disabled:opacity-40">Remove</button>
            </div>
          </article>
        `;
      }).join("");
      container.querySelectorAll("[data-pdf-remove]").forEach((button) => {
        button.addEventListener("click", () => {
          cmsDraftPdfs.splice(Number(button.dataset.pdfRemove), 1);
          renderCmsProjectPdfs();
        });
      });
    }

    async function publishCmsProjectPdfs() {
      if (cmsProjectPdfUploadActive) return;
      const editId = Number(document.getElementById("cmsEditProjectId").value);
      const projectIndex = portfolioProjects.findIndex((project) => project.id === editId);
      if (!editId || projectIndex === -1) {
        showCmsToast("Publish the project first, then attach PDFs to it.");
        return;
      }
      if (!cmsDraftPdfs.length && !getCmsProjectPdfFiles(portfolioProjects[projectIndex]).length) {
        showCmsToast("Select at least one PDF or keep one attached to this project.");
        return;
      }

      const project = portfolioProjects[projectIndex];
      const previousProject = project;
      const submitButton = document.getElementById("cmsProjectSubmitBtn");
      const submitButtonLabel = submitButton.textContent;
      const publishButton = document.getElementById("cmsPublishProjectPdfsBtn");
      const publishButtonLabel = publishButton.textContent;
      const pendingPdfs = cmsDraftPdfs.filter((pdf) => pdf.file instanceof File);
      const totalPdfBytes = pendingPdfs.reduce((total, pdf) => total + pdf.file.size, 0);
      let completedPdfBytes = 0;
      const savedPdfs = [];

      cmsProjectPdfUploadActive = true;
      submitButton.disabled = true;
      submitButton.textContent = "Saving PDF changes…";
      publishButton.disabled = true;
      publishButton.textContent = "Uploading and saving PDFs…";
      renderCmsProjectPdfs();
      try {
        for (const pdf of cmsDraftPdfs) {
          if (pdf.file instanceof File) {
            const url = await uploadCmsPdfFile(pdf.file, pdf.path, (loaded) => {
              updateCmsProjectUploadProgress({
                loaded: completedPdfBytes + loaded,
                total: totalPdfBytes,
                fileIndex: pendingPdfs.indexOf(pdf) + 1,
                fileCount: pendingPdfs.length
              });
            });
            completedPdfBytes += pdf.file.size;
            savedPdfs.push({ name: pdf.name, url, size: pdf.file.size });
            cmsDraftPdfs[cmsDraftPdfs.indexOf(pdf)] = { ...savedPdfs[savedPdfs.length - 1], pending: true };
            renderCmsProjectPdfs();
          } else if (pdf.url) {
            savedPdfs.push({ name: pdf.name, url: pdf.url, size: Number(pdf.size) || 0 });
          }
        }

        portfolioProjects[projectIndex] = {
          ...project,
          pdfFiles: savedPdfs,
          pdfUrl: savedPdfs[0]?.url || ""
        };
        const saved = await saveCmsState(updateCmsProjectUploadProgress);
        if (!saved) {
          portfolioProjects[projectIndex] = previousProject;
          return;
        }
        cmsDraftPdfs = savedPdfs;
        renderCmsProjectPdfs();
        showCmsToast("PDF files were attached to the published project.");
      } catch (error) {
        console.error("Unable to publish project PDF changes.", error);
        showCmsToast(error.message || "Unable to publish project PDF changes.");
      } finally {
        cmsProjectPdfUploadActive = false;
        submitButton.disabled = false;
        submitButton.textContent = submitButtonLabel;
        publishButton.disabled = false;
        publishButton.textContent = publishButtonLabel;
        renderCmsProjectPdfs();
        resetCmsProjectUploadProgress();
      }
    }

    function getCmsProjectPdfFiles(project) {
      const pdfFiles = Array.isArray(project.pdfFiles)
        ? project.pdfFiles
          .map((pdf) => {
            if (typeof pdf === "string") return { name: "Project PDF", url: pdf, size: 0 };
            if (!pdf || typeof pdf !== "object" || Array.isArray(pdf)) return null;
            return {
              name: typeof pdf.name === "string" && pdf.name ? pdf.name : "Project PDF",
              url: typeof pdf.url === "string" ? pdf.url : (typeof pdf.publicUrl === "string" ? pdf.publicUrl : ""),
              size: Number(pdf.size) || 0
            };
          })
          .filter(Boolean)
        : [];
      if (typeof project.pdfUrl === "string" && project.pdfUrl && !pdfFiles.some((pdf) => pdf.url === project.pdfUrl)) {
        pdfFiles.unshift({ name: "Project PDF", url: project.pdfUrl, size: 0 });
      }
      return pdfFiles.filter((pdf) => {
        if (/^https?:\/\//i.test(pdf.url)) return true;
        if (pdf.url) console.error("Ignoring a project PDF URL that does not use HTTP or HTTPS.");
        return false;
      });
    }

    function setPageMetadata(title, description) {
      document.title = title;
      const metadata = {
        description: description,
        "og:title": title,
        "og:description": description,
        "twitter:title": title,
        "twitter:description": description
      };
      Object.entries(metadata).forEach(([key, content]) => {
        const selector = key.startsWith("og:")
          ? `meta[property="${key}"]`
          : `meta[name="${key}"]`;
        const element = document.querySelector(selector);
        if (element) element.content = content;
      });
    }

    function updatePageMetadata(pageName, project = null) {
      const isAr = currentLang === "ar";
      if (project) {
        const title = isAr ? (project.titleAr || project.titleEn) : (project.titleEn || project.titleAr);
        const description = isAr
          ? (project.descriptionAr || project.descriptionEn || "")
          : (project.descriptionEn || project.descriptionAr || "");
        setPageMetadata(`${title} | Mostafa Khaled`, description);
        return;
      }

      const pageLabels = isAr
        ? { home: "الأعمال", resume: "السيرة الذاتية", partners: "الشركاء", about: "من أنا" }
        : { home: "Portfolio", resume: "Resume", partners: "Partners", about: "About" };
      const pageDescriptions = isAr
        ? {
            home: "مصطفى خالد، مصمم جرافيك متخصص في الهويات البصرية وتصميم المنتجات ثلاثية الأبعاد وCGI.",
            resume: "السيرة الذاتية لمصطفى خالد وخبراته في التصميم والهوية البصرية و3D.",
            partners: "علامات تجارية وشركات تعاون معها مصطفى خالد في التصميم.",
            about: "تعرف على مصطفى خالد وتخصصه في الهوية البصرية وتصميم 3D."
          }
        : {
            home: "Mostafa Khaled is a graphic designer specializing in brand identity, 3D product visualization, and CGI.",
            resume: "Experience and skills of Mostafa Khaled in graphic design, brand identity, and 3D.",
            partners: "Brands and businesses that have worked with Mostafa Khaled.",
            about: "Learn about Mostafa Khaled and his work in brand identity and 3D design."
          };
      const pageTitle = pageName === "home"
        ? (isAr ? "مصطفى خالد — تصميم وهوية" : "Mostafa Khaled — Brand & 3D")
        : `${pageLabels[pageName] || pageLabels.home} | Mostafa Khaled`;
      setPageMetadata(pageTitle, pageDescriptions[pageName] || pageDescriptions.home);
    }

    function updateCmsCoverReadProgress(percent, label = "Reading cover image…") {
      const wrapper = document.getElementById("cmsProjCoverReadProgress");
      const text = document.getElementById("cmsProjCoverReadProgressText");
      const percentLabel = document.getElementById("cmsProjCoverReadProgressPercent");
      const bar = document.getElementById("cmsProjCoverReadProgressBar");
      if (!wrapper || !text || !percentLabel || !bar) return;
      wrapper.classList.remove("hidden");
      text.textContent = label;
      percentLabel.textContent = `${percent}%`;
      bar.style.width = `${percent}%`;
      wrapper.querySelector('[role="progressbar"]')?.setAttribute("aria-valuenow", String(percent));
    }

    function updateCmsMediaBlockReadProgress(uid, percent) {
      const container = document.getElementById("cmsMediaBlocksContainer");
      const card = Array.from(container?.children || []).find((item) => item.dataset.blockUid === uid);
      if (!card) return;
      const text = card.querySelector("[data-image-read-progress-text]");
      const bar = card.querySelector("[data-image-read-progress-bar]");
      const progress = card.querySelector('[role="progressbar"]');
      if (text) text.textContent = `Reading image… ${percent}%`;
      if (bar) bar.style.width = `${percent}%`;
      if (progress) progress.setAttribute("aria-valuenow", String(percent));
    }

    function setCmsProjectCoverImage(imageUrl) {
      document.getElementById("cmsProjImgUrl").value = imageUrl || "";
      const image = document.getElementById("cmsProjCoverPreviewImage");
      if (imageUrl) {
        image.src = imageUrl;
      } else {
        image.removeAttribute("src");
      }
      updateCmsCoverPreviewCard();
    }

    function updateCmsCoverPreviewCard() {
      const isAr = currentLang === "ar";
      const image = document.getElementById("cmsProjCoverPreviewImage");
      const placeholder = document.getElementById("cmsProjCoverPreviewPlaceholder");
      const preview = document.getElementById("cmsProjCoverPreview");
      const countrySelect = document.getElementById("cmsProjCountry");
      const title = document.getElementById("cmsProjCoverPreviewTitle");
      const details = document.getElementById("cmsProjCoverPreviewDetails");
      const countryBadge = document.getElementById("cmsProjCoverPreviewCountry");
      const previewLabel = document.getElementById("cmsProjCoverPreviewLabel");
      const aspectSelect = document.getElementById("cmsProjCoverAspect");
      if (!image || !placeholder || !preview || !countrySelect || !title || !details || !countryBadge || !previewLabel || !aspectSelect) return;

      const imageUrl = document.getElementById("cmsProjImgUrl").value;
      const country = CMS_PROJECT_COUNTRIES.find((item) => item.value === countrySelect.value);
      const projectTitle = isAr
        ? (document.getElementById("cmsProjTitleAr").value.trim() || document.getElementById("cmsProjTitleEn").value.trim())
        : document.getElementById("cmsProjTitleEn").value.trim();
      const projectDetails = document.getElementById("cmsProjDeliverables").value.trim();
      const aspectRatios = {
        "aspect-[4/3]": "4 / 3",
        "aspect-video": "16 / 9",
        "aspect-square": "1 / 1",
        "aspect-[3/4]": "3 / 4",
        "aspect-[21/9]": "21 / 9"
      };

      image.classList.toggle("hidden", !imageUrl);
      placeholder.classList.toggle("hidden", Boolean(imageUrl));
      placeholder.textContent = isAr ? "اختر صورة الغلاف لمعاينة بطاقة المشروع." : "Select a cover image to preview the project card.";
      preview.style.aspectRatio = aspectRatios[aspectSelect.value] || "3 / 4";
      countryBadge.textContent = country ? (isAr ? country.arabic : country.value) : (isAr ? "الدولة" : "Country");
      title.textContent = projectTitle || (isAr ? "اسم المشروع" : "Project title");
      details.textContent = projectDetails || (isAr ? "تفاصيل المشروع" : "Project details will appear here");
      previewLabel.textContent = isAr ? "معاينة غلاف المشروع" : "Project cover preview";
    }

    function updateCmsProjectUploadProgress(progress) {
      const wrapper = document.getElementById("cmsProjectUploadProgress");
      const text = document.getElementById("cmsProjectUploadProgressText");
      const percentLabel = document.getElementById("cmsProjectUploadProgressPercent");
      const bar = document.getElementById("cmsProjectUploadProgressBar");
      if (!wrapper || !text || !percentLabel || !bar || !progress?.total) return;
      const percent = Math.min(100, Math.round((progress.loaded / progress.total) * 100));
      wrapper.classList.remove("hidden");
      text.textContent = progress.saving
        ? "Saving project details…"
        : `Uploading file ${progress.fileIndex} of ${progress.fileCount}…`;
      percentLabel.textContent = `${percent}%`;
      bar.style.width = `${percent}%`;
      wrapper.querySelector('[role="progressbar"]')?.setAttribute("aria-valuenow", String(percent));
    }

    function resetCmsProjectUploadProgress() {
      const wrapper = document.getElementById("cmsProjectUploadProgress");
      if (!wrapper) return;
      wrapper.classList.add("hidden");
      const text = document.getElementById("cmsProjectUploadProgressText");
      const percentLabel = document.getElementById("cmsProjectUploadProgressPercent");
      const bar = document.getElementById("cmsProjectUploadProgressBar");
      if (text) text.textContent = "Uploading project files…";
      if (percentLabel) percentLabel.textContent = "0%";
      if (bar) bar.style.width = "0%";
      wrapper.querySelector('[role="progressbar"]')?.setAttribute("aria-valuenow", "0");
    }

    function editCmsProject(id) {
      const proj = portfolioProjects.find((p) => p.id === id);
      if (!proj) return;
      setCmsProjectPublishStatus("");
      cmsCoverReadVersion += 1;
      cmsCoverReadPending = false;
      document.getElementById("cmsProjImgFile").value = "";
      document.getElementById("cmsProjPdfFile").value = "";
      document.getElementById("cmsProjCoverReadProgress").classList.add("hidden");
      document.getElementById("cmsEditProjectId").value = proj.id;
      document.getElementById("cmsProjectFormHeading").textContent = `Edit Project #0${proj.id} — ${proj.titleEn}`;
      document.getElementById("cmsProjectSubmitBtn").textContent = "Update Published Project";
      document.getElementById("cmsCancelEditProjectBtn").classList.remove("hidden");

      document.getElementById("cmsProjTitleEn").value = proj.titleEn || "";
      document.getElementById("cmsProjTitleAr").value = proj.titleAr || proj.titleEn || "";
      document.getElementById("cmsProjCountry").value = getCmsProjectCountry(proj);
      populateCmsProjectYearOptions(Number(proj.year) || new Date().getFullYear());
      setCmsProjectCoverImage(proj.imageUrl || "");
      document.getElementById("cmsProjCoverAspect").value = proj.coverAspect || "aspect-[3/4]";
      setCmsProjectTools(proj.tools || []);
      document.getElementById("cmsProjClientEn").value = proj.client || "";
      document.getElementById("cmsProjClientAr").value = proj.clientAr || "";
      document.getElementById("cmsProjCategoryEn").value = proj.categoryEn || "";
      document.getElementById("cmsProjCategoryAr").value = proj.categoryAr || "";
      document.getElementById("cmsProjRoleEn").value = proj.roleEn || "";
      document.getElementById("cmsProjRoleAr").value = proj.roleAr || "";
      document.getElementById("cmsProjSummaryEn").value = proj.descriptionEn || proj.descriptionAr || "";
      document.getElementById("cmsProjSummaryAr").value = proj.descriptionAr || "";
      document.getElementById("cmsProjDeliverables").value = proj.deliverablesEn || proj.deliverablesAr || "";
      document.getElementById("cmsProjDeliverablesAr").value = proj.deliverablesAr || "";
      document.getElementById("cmsProjDescEn").value = proj.challengeEn || proj.descriptionEn || proj.descriptionAr || "";
      document.getElementById("cmsProjDescAr").value = proj.challengeAr || "";
      document.getElementById("cmsProjSolutionEn").value = proj.solutionEn || "";
      document.getElementById("cmsProjSolutionAr").value = proj.solutionAr || "";
      document.getElementById("cmsProjOutcomeEn").value = proj.outcomeEn || "";
      document.getElementById("cmsProjOutcomeAr").value = proj.outcomeAr || "";
      cmsDraftPdfs = getCmsProjectPdfFiles(proj);
      renderCmsProjectPdfs();
      updateCmsCoverPreviewCard();
      cmsDraftFreeformGallery = proj.freeformGallery === true;
      cmsDraftGalleryChanged = false;

      if (Array.isArray(proj.mediaBlocks) && proj.mediaBlocks.length > 0) {
        cmsDraftBlocks = proj.mediaBlocks.map((b, index) => ({
          uid: b.uid || `blk_${Math.random().toString(36).slice(2, 9)}`,
          url: b.url || "",
          aspect: normalizeCmsMediaAspect(b.aspect),
          ...(cmsDraftFreeformGallery ? normalizeCmsMediaLayout(b, index) : {}),
          captionEn: b.captionEn || "",
          captionAr: b.captionAr || ""
        }));
      } else {
        cmsDraftBlocks = (proj.gallery || []).map((url, index) => ({
          uid: `blk_${Math.random().toString(36).slice(2, 9)}`,
          url,
          aspect: "aspect-auto",
          ...(cmsDraftFreeformGallery ? normalizeCmsMediaLayout({}, index) : {}),
          captionEn: "",
          captionAr: ""
        }));
      }
      updateCmsMediaEditorDescription();
      renderCmsMediaBlocksEditor();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function resetCmsProjectForm() {
      setCmsProjectPublishStatus("");
      document.getElementById("cmsProjectForm").reset();
      document.getElementById("cmsProjectNarrative").value = "";
      document.getElementById("cmsProjectAiConsent").checked = false;
      document.getElementById("cmsProjectAiStatus").textContent = "راجع كل الحقول وتأكد من المعلومات قبل النشر.";
      document.getElementById("cmsEditProjectId").value = "";
      document.getElementById("cmsProjectFormHeading").textContent = "Publish New Precision Project";
      document.getElementById("cmsProjectSubmitBtn").textContent = "Publish Complete Project to Platform";
      document.getElementById("cmsCancelEditProjectBtn").classList.add("hidden");
      cmsDraftFreeformGallery = true;
      cmsDraftGalleryChanged = false;
      updateCmsMediaEditorDescription();
      document.getElementById("cmsProjCountry").value = "";
      populateCmsProjectYearOptions();
      cmsCoverReadVersion += 1;
      cmsCoverReadPending = false;
      setCmsProjectCoverImage("");
      document.getElementById("cmsProjCoverReadProgress").classList.add("hidden");
      document.getElementById("cmsProjImgFile").value = "";
      document.getElementById("cmsBatchImagesInput").value = "";
      document.getElementById("cmsProjPdfFile").value = "";
      cmsDraftPdfs = [];
      renderCmsProjectPdfs();
      resetCmsProjectUploadProgress();
      cmsDraftBlocks = [];
      renderCmsMediaBlocksEditor();
    }

    function updateCmsMediaEditorDescription() {
      const description = document.getElementById("cmsMediaEditorDescription");
      if (!description) return;
      const isAr = currentLang === "ar";
      description.textContent = cmsDraftFreeformGallery
        ? (isAr
          ? "رتّب الصور بحرية على المساحة. اسحب الصورة لتحريكها، واسحب الزاوية لتغيير حجمها، وحدد طريقة ملاءمتها."
          : "Arrange images freely on the canvas. Drag an image to move it, pull its corner to resize, and choose how it should fit.")
        : (isAr
          ? "هذه الصور تتبع تنسيق المعرض الحالي. يمكنك إضافة صور وتغيير ترتيبها ونسبة عرضها دون تغيير تخطيط المشروع المنشور."
          : "These images keep the existing gallery layout. Add images, reorder them, and change their aspect ratio without changing the published layout.");
    }

    async function deleteCmsProject(id) {
      if (portfolioProjects.length <= 1) {
        showCmsToast("At least 1 project must remain published.");
        return;
      }
      const previousProjects = portfolioProjects;
      portfolioProjects = portfolioProjects.filter((p) => p.id !== id);
      const saved = await saveCmsState();
      if (!saved) {
        portfolioProjects = previousProjects;
        return;
      }
      buildCarouselCards();
      renderAdminDashboard();
      showCmsToast("Project deleted from platform.");
    }

    async function moveCmsProjectToIndex(projectId, newIndex) {
      if (cmsProjectOrderSaving) return;
      const currentIndex = portfolioProjects.findIndex((project) => project.id === projectId);
      if (currentIndex === -1) return;
      const destinationIndex = Math.max(0, Math.min(newIndex, portfolioProjects.length - 1));
      if (currentIndex === destinationIndex) return;

      const previousProjects = [...portfolioProjects];
      const [project] = portfolioProjects.splice(currentIndex, 1);
      portfolioProjects.splice(destinationIndex, 0, project);
      cmsProjectOrderSaving = true;
      document.querySelectorAll("#cmsProjectsList button").forEach((button) => {
        button.disabled = true;
      });
      document.querySelectorAll("#cmsProjectsList [data-project-order-row]").forEach((row) => {
        row.setAttribute("draggable", "false");
      });
      try {
        if (!await saveCmsState()) {
          portfolioProjects = previousProjects;
          return;
        }
        targetIndex = 0;
        virtualIndex = 0;
        buildCarouselCards();
        showCmsToast("Project order saved.");
      } catch (error) {
        portfolioProjects = previousProjects;
        console.error("Unable to save the project order.", error);
        showCmsToast(`Project order could not be saved: ${error.message || "Supabase request failed."}`);
      } finally {
        cmsProjectOrderSaving = false;
        renderAdminDashboard();
      }
    }

    function filterCmsProjectList() {
      const searchInput = document.getElementById("cmsProjectSearch");
      const rows = document.querySelectorAll("#cmsProjectsList [data-project-order-row]");
      if (!searchInput) return;
      const query = searchInput.value.trim().toLocaleLowerCase();
      let visibleCount = 0;

      rows.forEach((row) => {
        const project = portfolioProjects.find((item) => item.id === Number(row.dataset.projectOrderRow));
        if (!project) return;
        const searchableText = [
          project.titleEn,
          project.titleAr,
          project.client,
          project.year,
          project.location,
          project.locationAr,
          project.categoryEn,
          project.categoryAr,
          project.deliverablesEn,
          project.deliverablesAr,
          ...(Array.isArray(project.tools) ? project.tools : [])
        ].filter(Boolean).join(" ").toLocaleLowerCase();
        const matches = !query || searchableText.includes(query);
        row.classList.toggle("hidden", !matches);
        if (matches) visibleCount += 1;
      });

      const count = document.getElementById("cmsProjectSearchCount");
      if (count) count.textContent = `Showing ${visibleCount} of ${portfolioProjects.length} projects`;
    }

    function renderAdminDashboard() {
      renderCmsMediaBlocksEditor();

      // Populate Content Form
      document.getElementById("cmsStudioTagEn").value = cmsConfig.studioTagEn;
      document.getElementById("cmsStudioTagAr").value = cmsConfig.studioTagAr;
      document.getElementById("cmsHeroTitleEn").value = cmsConfig.heroTitleEn;
      document.getElementById("cmsHeroTitleAr").value = cmsConfig.heroTitleAr;
      document.getElementById("cmsHeroSubEn").value = cmsConfig.heroSubEn;
      document.getElementById("cmsHeroSubAr").value = cmsConfig.heroSubAr;
      document.getElementById("cmsAboutBioEn").value = cmsConfig.aboutBioEn;
      document.getElementById("cmsAboutBioAr").value = cmsConfig.aboutBioAr;
      document.getElementById("cmsAboutTitleEn").value = cmsConfig.aboutTitleEn;
      document.getElementById("cmsAboutTitleAr").value = cmsConfig.aboutTitleAr;
      document.getElementById("cmsAboutStatusEn").value = cmsConfig.aboutStatusEn;
      document.getElementById("cmsAboutStatusAr").value = cmsConfig.aboutStatusAr;
      document.getElementById("cmsResumeTitleEn").value = cmsConfig.resumeTitleEn;
      document.getElementById("cmsResumeTitleAr").value = cmsConfig.resumeTitleAr;
      document.getElementById("cmsResumeIntroEn").value = cmsConfig.resumeIntroEn;
      document.getElementById("cmsResumeIntroAr").value = cmsConfig.resumeIntroAr;
      document.getElementById("cmsPartnersTitleEn").value = cmsConfig.partnersTitleEn;
      document.getElementById("cmsPartnersTitleAr").value = cmsConfig.partnersTitleAr;

      // Populate Contact Form
      document.getElementById("cmsWaNumber").value = cmsConfig.waNumber;
      document.getElementById("cmsWaDisplay").value = cmsConfig.waDisplay;
      document.getElementById("cmsEmailAddr").value = cmsConfig.email;
      document.getElementById("cmsBehanceUrl").value = cmsConfig.behanceUrl;
      document.getElementById("cmsSocialHandle").value = cmsConfig.socialHandle;
      // Populate Identity Form
      document.getElementById("cmsColorPrimary").value = cmsConfig.primaryColor;
      document.getElementById("cmsColorPrimaryHex").textContent = cmsConfig.primaryColor;
      document.getElementById("cmsColorBg").value = cmsConfig.bgColor;
      document.getElementById("cmsColorBgHex").textContent = cmsConfig.bgColor;
      document.getElementById("cmsColorMuted").value = cmsConfig.mutedColor;
      document.getElementById("cmsColorMutedHex").textContent = cmsConfig.mutedColor;
      document.getElementById("cmsCustomLogoBrandText").value = cmsConfig.customLogoText || "";

      renderCmsPageEditors();

      // Render Projects List
      const countEl = document.getElementById("cmsProjectsCount");
      if (countEl) countEl.textContent = portfolioProjects.length;
      const listEl = document.getElementById("cmsProjectsList");
      if (listEl) {
        listEl.innerHTML = portfolioProjects.map((proj, index) => `
          <div class="ios-subcard rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing" data-project-order-row="${proj.id}" draggable="true">
            <div class="flex items-center gap-3 min-w-0">
              <img src="${proj.imageUrl}" alt="${proj.titleEn}" loading="lazy" decoding="async" class="w-14 h-14 rounded-xl object-cover shrink-0 border border-white" />
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded-full bg-obsidian text-white text-[10px] font-bold">Order ${index + 1}</span>
                  <span class="text-[10px] font-semibold text-slateText">#${proj.id}</span>
                  <span class="text-[10px] font-semibold text-slateText">${proj.categoryEn}</span>
                </div>
                <h4 class="text-xs sm:text-sm font-bold text-obsidian truncate mt-0.5">${proj.titleEn}</h4>
                <p class="text-[11px] text-slateText truncate">${proj.titleAr} • ${proj.client}</p>
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button type="button" data-project-move="up" data-project-id="${proj.id}" ${index === 0 || cmsProjectOrderSaving ? "disabled" : ""} aria-label="Move project up" class="px-2 py-1.5 rounded-xl bg-white/80 hover:bg-white text-sm font-bold text-obsidian disabled:opacity-30">↑</button>
              <button type="button" data-project-move="down" data-project-id="${proj.id}" ${index === portfolioProjects.length - 1 || cmsProjectOrderSaving ? "disabled" : ""} aria-label="Move project down" class="px-2 py-1.5 rounded-xl bg-white/80 hover:bg-white text-sm font-bold text-obsidian disabled:opacity-30">↓</button>
              <button type="button" onclick="openProjectPage(${proj.id})" class="px-2.5 py-1.5 rounded-xl bg-white/80 hover:bg-white text-[11px] font-semibold text-obsidian">View</button>
              <button type="button" onclick="editCmsProject(${proj.id})" class="px-2.5 py-1.5 rounded-xl bg-obsidian text-white text-[11px] font-semibold hover:opacity-90">Edit</button>
              <button type="button" onclick="deleteCmsProject(${proj.id})" class="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-700 text-[11px] font-bold">✕</button>
            </div>
          </div>
        `).join("");
        listEl.querySelectorAll("[data-project-move]").forEach((button) => {
          button.addEventListener("click", () => {
            const projectId = Number(button.dataset.projectId);
            const currentIndex = portfolioProjects.findIndex((project) => project.id === projectId);
            const direction = button.dataset.projectMove === "up" ? -1 : 1;
            moveCmsProjectToIndex(projectId, currentIndex + direction);
          });
        });
        listEl.querySelectorAll("[data-project-order-row]").forEach((row) => {
          row.addEventListener("dragstart", (event) => {
            if (cmsProjectOrderSaving) {
              event.preventDefault();
              return;
            }
            event.dataTransfer?.setData("text/plain", row.dataset.projectOrderRow);
            if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
            row.classList.add("opacity-50");
          });
          row.addEventListener("dragover", (event) => {
            if (cmsProjectOrderSaving) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
          });
          row.addEventListener("drop", (event) => {
            event.preventDefault();
            if (cmsProjectOrderSaving) return;
            const projectId = Number(event.dataTransfer?.getData("text/plain"));
            const currentIndex = portfolioProjects.findIndex((project) => project.id === projectId);
            const destinationIndex = portfolioProjects.findIndex((project) => project.id === Number(row.dataset.projectOrderRow));
            if (currentIndex !== -1 && destinationIndex !== -1) {
              moveCmsProjectToIndex(projectId, destinationIndex);
            }
          });
          row.addEventListener("dragend", () => row.classList.remove("opacity-50"));
        });
        filterCmsProjectList();
      }
    }

    // ==================== SMART COOKIE & VISITOR INTEREST ENGINE ====================
    const COOKIE_KEY = "mk_studio_visitor_prefs";
    let visitorCookieState = {
      consent: false,
      dismissed: false,
      selectedInterest: null, // "3D" | "Branding" | "Social" | "UI"
      scores: { "3D": 0, "Branding": 0, "Social": 0, "UI": 0 },
      viewedIds: []
    };

    function setBrowserCookie(name, valueObj, days = 90) {
      try {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        const encoded = encodeURIComponent(JSON.stringify(valueObj));
        document.cookie = `${name}=${encoded}; expires=${expires}; path=/; SameSite=Lax`;
        localStorage.setItem(name, JSON.stringify(valueObj));
      } catch (e) {}
    }

    function getBrowserCookie(name) {
      try {
        const match = document.cookie.split("; ").find((row) => row.startsWith(name + "="));
        if (match) {
          return JSON.parse(decodeURIComponent(match.split("=")[1]));
        }
        const ls = localStorage.getItem(name);
        return ls ? JSON.parse(ls) : null;
      } catch (e) {
        return null;
      }
    }

    function getDominantInterest() {
      if (visitorCookieState.selectedInterest) return visitorCookieState.selectedInterest;
      const entries = Object.entries(visitorCookieState.scores || {});
      entries.sort((a, b) => b[1] - a[1]);
      return entries[0] && entries[0][1] > 0 ? entries[0][0] : null;
    }

    function getInterestDisplayName(interestKey, isAr) {
      const map = {
        "3D": isAr ? "تصميم 3D والـ CGI" : "3D & CGI Visuals",
        "Branding": isAr ? "الهويات البصرية" : "Brand Identity",
        "Social": isAr ? "حملات السوشيال ميديا" : "Social Campaigns",
        "UI": isAr ? "واجهات UI والتطبيقات" : "UI & Digital Design"
      };
      return map[interestKey] || (isAr ? "مقترح لك" : "For You");
    }

    function getProjectMatchScore(proj) {
      const dominant = getDominantInterest();
      if (!dominant) return 0;
      const hay = `${proj.categoryEn} ${proj.titleEn} ${proj.deliverablesEn}`.toLowerCase();
      if (dominant === "3D" && (hay.includes("3d") || hay.includes("cgi") || hay.includes("exhibition"))) return 10;
      if (dominant === "Branding" && (hay.includes("brand") || hay.includes("logo"))) return 10;
      if (dominant === "Social" && (hay.includes("social") || hay.includes("campaign"))) return 10;
      if (dominant === "UI" && (hay.includes("ui") || hay.includes("app") || hay.includes("interface"))) return 10;
      return 0;
    }

    function trackVisitorProjectInterest(proj) {
      if (!proj) return;
      if (!visitorCookieState.viewedIds.includes(proj.id)) {
        visitorCookieState.viewedIds.push(proj.id);
      }
      const hay = `${proj.categoryEn} ${proj.titleEn}`.toLowerCase();
      if (hay.includes("3d") || hay.includes("cgi")) visitorCookieState.scores["3D"] += 2;
      if (hay.includes("brand") || hay.includes("logo")) visitorCookieState.scores["Branding"] += 2;
      if (hay.includes("social")) visitorCookieState.scores["Social"] += 2;
      if (hay.includes("ui")) visitorCookieState.scores["UI"] += 2;

      if (visitorCookieState.consent) {
        setBrowserCookie(COOKIE_KEY, visitorCookieState);
      }
      updateCookieUI();
    }

    function selectVisitorInterest(interestKey) {
      visitorCookieState.consent = true;
      visitorCookieState.selectedInterest = interestKey;
      visitorCookieState.scores[interestKey] = (visitorCookieState.scores[interestKey] || 0) + 5;
      setBrowserCookie(COOKIE_KEY, visitorCookieState);

      // Focus panoramic carousel onto best-matching project
      const bestIdx = portfolioProjects.findIndex((p) => getProjectMatchScore(p) > 0);
      if (bestIdx !== -1) {
        targetIndex = bestIdx;
      }

      buildCarouselCards();
      updateCookieUI();
    }

    function acceptAllSmartCookies() {
      visitorCookieState.consent = true;
      visitorCookieState.dismissed = true;
      setBrowserCookie(COOKIE_KEY, visitorCookieState);
      updateCookieUI();
    }

    function updateCookieUI() {
      const isAr = currentLang === "ar";
      const card = document.getElementById("cookiePreferenceCard");
      const cardTitle = document.getElementById("cookieCardTitle");
      const cardSub = document.getElementById("cookieCardSub");
      const hintEl = document.getElementById("cookieDetectedHint");
      const acceptBtn = document.getElementById("acceptCookiesBtn");
      const heroTag = document.getElementById("heroStudioTag");

      const dominant = getDominantInterest();

      if (cardTitle) cardTitle.textContent = isAr ? "كوكيز التخصيص الذكي" : "Smart Personalization Cookies";
      if (cardSub) {
        cardSub.textContent = isAr
          ? "اختر مجال اهتمامك لنقترح لك المشاريع والتصاميم الأنسب لذوقك تلقائياً."
          : "Select your creative interest so we tailor recommended works for you.";
      }
      if (acceptBtn) acceptBtn.textContent = isAr ? "موافق" : "Accept & Save";
      if (hintEl) {
        hintEl.textContent = dominant
          ? (isAr ? `اهتمامك: ${getInterestDisplayName(dominant, true)}` : `Interest: ${getInterestDisplayName(dominant, false)}`)
          : (isAr ? "تظهر هذه الرسالة عند زيارتك الأولى فقط" : "Shown on your first visit only");
      }

      // Highlight selected interest chip
      document.querySelectorAll(".interest-chip").forEach((chip) => {
        const key = chip.getAttribute("data-interest");
        const labels = {
          "3D": isAr ? "تصميم 3D و CGI" : "3D & CGI",
          "Branding": isAr ? "هويات بصرية" : "Branding",
          "Social": isAr ? "سوشيال ميديا" : "Social Media",
          "UI": isAr ? "واجهات UI" : "UI / Digital"
        };
        if (labels[key]) chip.textContent = labels[key];

        if (visitorCookieState.selectedInterest === key) {
          chip.classList.add("bg-[#111214]", "text-white", "border-[#111214]");
          chip.classList.remove("bg-white/80", "text-[#111214]", "border-white");
        } else {
          chip.classList.remove("bg-[#111214]", "text-white", "border-[#111214]");
          chip.classList.add("bg-white/80", "text-[#111214]", "border-white");
        }
      });

      if (heroTag && dominant) {
        heroTag.textContent = isAr
          ? `مقترح خصيصاً لاهتمامك بـ ${getInterestDisplayName(dominant, true)}`
          : `Curated For Your Interest in ${getInterestDisplayName(dominant, false)}`;
      } else if (heroTag) {
        heroTag.textContent = isAr ? cmsConfig.studioTagAr : cmsConfig.studioTagEn;
      }

      // Show ONLY on first visit (until user accepts or dismisses it)
      if (card) {
        const hasSeenPrompt = visitorCookieState.consent || visitorCookieState.dismissed;
        if (hasSeenPrompt) {
          card.classList.add("hidden");
        } else {
          card.classList.remove("hidden");
        }
      }
    }

    // ==================== PORTFOLIO CONTENT DATA ====================
    let experienceData = [
      {
        company: "P.Team & To Vision",
        roleEn: "Senior 3D & Exhibition Designer",
        roleAr: "مصمم معارض ومنتجات 3D أول",
        locationEn: "Saudi Arabia",
        locationAr: "المملكة العربية السعودية",
        countryCode: "KSA",
        period: "2024 – 2026",
        summaryEn: "Leading 3D product modeling, Saudi Founding Day corporate gifts, and modular Ramadan wayfinding structures for Kidana.",
        summaryAr: "قيادة نمذجة المنتجات ثلاثية الأبعاد وتوزيعات يوم التأسيس السعودي وتصاميم اللوحات الإرشادية الرمضانية لشركة كدانة."
      },
      {
        company: "Silvage Medical Co.",
        roleEn: "Lead Brand Identity Designer",
        roleAr: "مصمم هوية بصرية رئيسي",
        locationEn: "Riyadh, KSA",
        locationAr: "الرياض، السعودية",
        countryCode: "KSA",
        period: "2024 – 2025",
        summaryEn: "Architected the complete clinical brand system, packaging guidelines, and digital identity for the Saudi healthcare sector.",
        summaryAr: "بناء نظام الهوية البصرية الكامل وأدلة التغليف والهوية الرقمية لقطاع الرعاية الصحية في المملكة العربية السعودية."
      },
      {
        company: "Al Hazmi Real Estate",
        roleEn: "3D Architectural & Brand Visualizer",
        roleAr: "مصمم هوية وإظهار معماري 3D",
        locationEn: "Saudi Arabia",
        locationAr: "المملكة العربية السعودية",
        countryCode: "KSA",
        period: "2023 – 2024",
        summaryEn: "Created corporate monogram branding and photorealistic 3D exterior architectural renders for residential developments.",
        summaryAr: "تصميم الهوية المؤسسية والريندر المعماري ثلاثي الأبعاد الواقعي للمشاريع السكنية والتطوير العقاري."
      },
      {
        company: "Hempel Paints (Obhour)",
        roleEn: "3D Product & Campaign Designer",
        roleAr: "مصمم منتجات 3D وحملات إعلانية",
        locationEn: "Jeddah, KSA",
        locationAr: "جدة، السعودية",
        countryCode: "KSA",
        period: "2023",
        summaryEn: "Produced PBR 3D paint product renders and digital promotional campaigns for Contex and Casa Rustica coatings.",
        summaryAr: "إنتاج ريندر ثلاثي الأبعاد لعبوات الدهانات وحملات ترويجية رقمية لمنتجات كونتكس وكازا رستيكا."
      },
      {
        company: "Al-Riyadh Creative Hub",
        roleEn: "Senior Visual & Social Designer",
        roleAr: "مصمم بصري وسوشيال ميديا أول",
        locationEn: "Riyadh, KSA",
        locationAr: "الرياض، السعودية",
        countryCode: "KSA",
        period: "2022 – 2023",
        summaryEn: "Directed visual campaigns, typography systems, and social media branding for Gulf F&B and retail enterprises.",
        summaryAr: "إدارة الحملات البصرية وأنظمة الخطوط وهويات التواصل الاجتماعي لشركات الأغذية والتجزئة في الخليج."
      },
      {
        company: "Gulf Vision Advertising",
        roleEn: "Outdoor CGI & Print Designer",
        roleAr: "مصمم CGI وإعلانات خارجية",
        locationEn: "Dammam, KSA",
        locationAr: "الدمام، السعودية",
        countryCode: "KSA",
        period: "2021 – 2022",
        summaryEn: "Designed large-format outdoor billboards, exhibition booths, and 3D mockups for commercial launches.",
        summaryAr: "تصميم لوحات الطرق الإعلانية الضخمة وأجنحة المعارض والنماذج ثلاثية الأبعاد للإطلاقات التجارية."
      },
      {
        company: "Mansoura Downtown & Eskan",
        roleEn: "Senior Brand & CGI Designer",
        roleAr: "مصمم هويات ودمج CGI أول",
        locationEn: "Mansoura, Egypt",
        locationAr: "المنصورة، مصر",
        countryCode: "Egypt",
        period: "2023 – 2025",
        summaryEn: "Developed brand identity, aqua park launch campaigns, and photorealistic 3D CGI tower wraps for City Center & Al Badry Towers.",
        summaryAr: "تطوير الهوية البصرية وحملات إطلاق الأكوا بارك ودمج إعلانات الأبراج بتقنية 3D CGI لسيتي سنتر وأبراج البدري."
      },
      {
        company: "Al Amal Real Estate & Medical Clinics",
        roleEn: "UI & Healthcare Campaign Designer",
        roleAr: "مصمم واجهات UI وحملات طبية",
        locationEn: "Egypt",
        locationAr: "مصر",
        countryCode: "Egypt",
        period: "2022 – 2024",
        summaryEn: "Designed mobile real estate app interfaces and specialized medical awareness campaigns for Dr. Mahmoud Fertility Clinic.",
        summaryAr: "تصميم واجهات تطبيقات العقارات والحملات الطبية التوعوية المتخصصة لعيادة د. محمود للحقن المجهري."
      },
      {
        company: "Perfect Sport Club",
        roleEn: "Brand Identity & Sports Designer",
        roleAr: "مصمم هويات وحملات رياضية",
        locationEn: "Talkha, Egypt",
        locationAr: "طلخا، مصر",
        countryCode: "Egypt",
        period: "2020 – 2022",
        summaryEn: "Led full club rebranding and dynamic promotional campaigns across gymnastics, judo, and squash academies.",
        summaryAr: "قيادة إعادة بناء الهوية البصرية للنادي وتصميم الحملات الترويجية لأكاديميات الجمباز والجودو والسكواش."
      }
    ];

    let softwareList = [
      { code: "Ps", name: "Adobe Photoshop", level: 96, roleEn: "Compositing, Retouching & Key Visuals", roleAr: "الدمج الاحترافي والمعالجة البصرية" },
      { code: "Ai", name: "Adobe Illustrator", level: 95, roleEn: "Brand Identity, Logos & Vector Systems", roleAr: "الهويات البصرية والشعارات والفيكتور" },
      { code: "Bl", name: "Blender 3D", level: 92, roleEn: "3D Modeling, Product Renders & CGI", roleAr: "النمذجة ثلاثية الأبعاد والريندر والـ CGI" },
      { code: "Sp", name: "Adobe Substance 3D", level: 88, roleEn: "PBR Materials, Textures & Packaging", roleAr: "الخامات الواقعية والتغليف ثلاثي الأبعاد" },
      { code: "Ae", name: "Adobe After Effects", level: 85, roleEn: "Motion Graphics & CGI Tracking", roleAr: "الموشن جرافيك وتتبع الكاميرا" },
      { code: "Fg", name: "Figma & AI Tools", level: 86, roleEn: "UI Design & Generative Workflows", roleAr: "تصميم الواجهات وأدوات الذكاء الاصطناعي" }
    ];

    let educationData = {
      degreeEn: "Bachelor's Degree in Specific Education — Art & Design",
      degreeAr: "بكالوريوس التربية النوعية — قسم التربية الفنية والتصميم",
      universityEn: "Mansoura University, Egypt",
      universityAr: "جامعة المنصورة، جمهورية مصر العربية",
      period: "2016 – 2020"
    };

    let expertiseTags = [
      { en: "Brand Identity Systems", ar: "أنظمة الهوية البصرية" },
      { en: "3D Product Modeling", ar: "نمذجة المنتجات 3D" },
      { en: "Outdoor CGI & VFX", ar: "دمج إعلانات الشوارع CGI" },
      { en: "Packaging & Mockups", ar: "تصميم العبوات والتغليف" },
      { en: "Exhibition & Booth 3D", ar: "تصميم المعارض والبوثات" },
      { en: "Social Media Campaigns", ar: "حملات السوشيال ميديا" },
      { en: "UI/UX Visual Design", ar: "تصميم واجهات المستخدم" },
      { en: "Typography & Print", ar: "التايبوجرافي والمطبوعات" }
    ];

    let resumeStats = [
      { value: "+06", labelEn: "Years of Experience", labelAr: "سنوات الخبرة العملية", subEn: "KSA & Egypt Markets", subAr: "السوق السعودي والمصري", icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>` },
      { value: "+180", labelEn: "Projects & Identities", labelAr: "مشروع وهوية بصرية", subEn: "2D, 3D & CGI Visuals", subAr: "تصميم 2D و 3D و CGI", icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>` },
      { value: "+09", labelEn: "Agencies & Brands", labelAr: "شركات ووكالات كبرى", subEn: "Creative Direction", subAr: "قيادة وتنفيذ إبداعي", icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>` },
      { value: "95%", labelEn: "Visual Craft Precision", labelAr: "دقة الإخراج البصري", subEn: "Photoshop & Blender Mastery", subAr: "إتقان Photoshop و Blender", icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>` }
    ];

    let partnerStats = [
      { value: "+09", labelEn: "Strategic Success Partners", labelAr: "شركاء نجاح استراتيجيين", subEn: "Leading Regional Brands", subAr: "علامات تجارية رائدة" },
      { value: "05", labelEn: "Diverse Industry Sectors", labelAr: "قطاعات اقتصادية متنوعة", subEn: "Industrial, F&B, Logistics, Spa", subAr: "صناعي، غذائي، لوجستي، عناية" },
      { value: "+25", labelEn: "Years Partner Heritage", labelAr: "عاماً من عراقة الشركاء", subEn: "Established Gulf Enterprises", subAr: "مؤسسات راسخة في الخليج" },
      { value: "100%", labelEn: "Brand Consistency", labelAr: "تطابق الهوية البصرية", subEn: "Tailored Visual Systems", subAr: "حلول مصممة خصيصاً" }
    ];

    let partnerSectors = [
      { key: "enterprise", en: "Enterprise & Industry", ar: "المؤسسات والصناعة" },
      { key: "fnb", en: "Food & Hospitality", ar: "الأغذية والضيافة" },
      { key: "wellness", en: "Beauty & Wellness", ar: "الجمال والعناية" },
      { key: "logistics", en: "Logistics & Delivery", ar: "التوصيل واللوجستيات" },
      { key: "advertising", en: "Advertising & Events", ar: "الدعاية والمعارض" }
    ];

    let aboutStats = [
      { value: "+06", labelEn: "Years of Craft", labelAr: "سنوات من الإبداع", subEn: "Continuous Market Mastery", subAr: "خبرة متواصلة في السوق" },
      { value: "2D+3D", labelEn: "Dual Specialization", labelAr: "تخصص مزدوج متكامل", subEn: "Brand Systems & 3D CGI", subAr: "هويات بصرية ونمذجة 3D" },
      { value: "02", labelEn: "Regional Markets", labelAr: "أسواق إقليمية رئيسية", subEn: "Saudi Arabia & Egypt", subAr: "السعودية ومصر" },
      { value: "100%", labelEn: "Delivery Commitment", labelAr: "التزام بالجودة والتسليم", subEn: "Attention to Detail", subAr: "دقة التفاصيل والابتكار" }
    ];

    let aboutPillars = [
      {
        titleEn: "Strategic Brand Identity",
        titleAr: "بناء الهويات البصرية الاستراتيجية",
        descEn: "Crafting memorable logos, packaging, and cohesive visual systems tailored to position brands distinctly in competitive markets.",
        descAr: "تصميم شعارات وأنظمة هوية بصرية متكاملة وتغليف احترافي يمنح العلامات التجارية حضوراً قوياً ومتميزاً في الأسواق التنافسية.",
        icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`
      },
      {
        titleEn: "Photorealistic 3D & CGI",
        titleAr: "الواقعية الفائقة في الـ 3D والـ CGI",
        descEn: "Specializing in 3D product modeling, studio lighting, architectural visualization, and outdoor CGI billboard integration using Blender & Substance.",
        descAr: "التخصص في نمذجة المنتجات ثلاثية الأبعاد وإضاءة الاستوديو ودمج إعلانات الشوارع بتقنية CGI باستخدام Blender و Substance.",
        icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`
      },
      {
        titleEn: "AI-Enhanced Creative Workflow",
        titleAr: "التكامل التقني والذكاء الاصطناعي",
        descEn: "Combining traditional design principles with modern AI generative tools, Runway, and motion graphics to accelerate visual storytelling.",
        descAr: "دمج قواعد التصميم الأكاديمية مع أدوات الذكاء الاصطناعي التوليدي والموشن جرافيك لتقديم حلول بصرية مبتكرة وسريعة التنفيذ.",
        icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
      }
    ];

    let aboutTags = [
      { value: "BRANDING" },
      { value: "3D_DESIGN" },
      { value: "3D_PRODUCT" },
      { value: "PRINT_DESIGN" },
      { value: "MOTION_GRAPHIC" }
    ];

    let partnersData = [
      {
        name: "Kidana Development",
        sectorKey: "enterprise",
        sectorLabelEn: "Urban & Holy Sites Development",
        sectorLabelAr: "التطوير الحضري والمشاعر المقدسة",
        badgeEn: "KSA Enterprise",
        badgeAr: "مؤسسة سعودية",
        countryEn: "Makkah, Saudi Arabia",
        countryAr: "مكة المكرمة، السعودية",
        descEn: "Designed modular Ramadan wayfinding structures and 3D environmental signage concepts.",
        descAr: "تصميم قوالب اللوحات الإرشادية الرمضانية والهوية البيئية ثلاثية الأبعاد.",
        icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>`
      },
      {
        name: "Hempel Coatings",
        sectorKey: "enterprise",
        sectorLabelEn: "Industrial & Decorative Paints",
        sectorLabelAr: "الدهانات الصناعية والديكورية",
        badgeEn: "Global Brand",
        badgeAr: "علامة عالمية",
        countryEn: "Jeddah, Saudi Arabia",
        countryAr: "جدة، السعودية",
        descEn: "3D product packaging visualization and digital campaigns for protective and decorative lines.",
        descAr: "إظهار ثلاثي الأبعاد لعبوات الدهانات وحملات رقمية لخطوط الحماية والديكور.",
        icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
      },
      {
        name: "Silvage Medical",
        sectorKey: "wellness",
        sectorLabelEn: "Medical & Healthcare Supplies",
        sectorLabelAr: "المستلزمات الطبية والرعاية الصحية",
        badgeEn: "Healthcare",
        badgeAr: "قطاع طبي",
        countryEn: "Riyadh, Saudi Arabia",
        countryAr: "الرياض، السعودية",
        descEn: "Full corporate visual identity, clinical stationery, and product branding guidelines.",
        descAr: "تصميم الهوية البصرية الكاملة والمطبوعات الطبية ودليل استخدام العلامة.",
        icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`
      },
      {
        name: "Al Hazmi Real Estate",
        sectorKey: "enterprise",
        sectorLabelEn: "Real Estate & Property Development",
        sectorLabelAr: "التطوير والاستثمار العقاري",
        badgeEn: "Real Estate",
        badgeAr: "تطوير عقاري",
        countryEn: "Saudi Arabia",
        countryAr: "المملكة العربية السعودية",
        descEn: "Corporate brand identity and photorealistic 3D architectural exterior visualizations.",
        descAr: "تصميم الهوية المؤسسية والإظهار المعماري الخارجي ثلاثي الأبعاد.",
        icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>`
      },
      {
        name: "P.Team & To Vision",
        sectorKey: "advertising",
        sectorLabelEn: "Events, Exhibitions & Branding",
        sectorLabelAr: "المعارض والفعاليات والهويات",
        badgeEn: "Agency Partner",
        badgeAr: "وكالة إبداعية",
        countryEn: "Saudi Arabia",
        countryAr: "المملكة العربية السعودية",
        descEn: "Strategic creative collaboration on Saudi Founding Day 3D gifts and exhibition booths.",
        descAr: "شراكة إبداعية لتنفيذ توزيعات يوم التأسيس ثلاثية الأبعاد وأجنحة المعارض.",
        icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/></svg>`
      },
      {
        name: "Al-Mazaq Roastery & Hospitality",
        sectorKey: "fnb",
        sectorLabelEn: "Specialty Coffee & Hospitality",
        sectorLabelAr: "القهوة المختصة والضيافة",
        badgeEn: "F&B Sector",
        badgeAr: "أغذية وضيافة",
        countryEn: "Riyadh, Saudi Arabia",
        countryAr: "الرياض، السعودية",
        descEn: "3D coffee pouch packaging renders, seasonal menus, and brand visual storytelling.",
        descAr: "تصميم وريندر عبوات القهوة ثلاثية الأبعاد وقوائم الضيافة الموسمية.",
        icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>`
      },
      {
        name: "Veloura Beauty & Spa",
        sectorKey: "wellness",
        sectorLabelEn: "Luxury Cosmetics & Wellness",
        sectorLabelAr: "مستحضرات التجميل والعناية",
        badgeEn: "Beauty & Care",
        badgeAr: "جمال وعناية",
        countryEn: "Jeddah, Saudi Arabia",
        countryAr: "جدة، السعودية",
        descEn: "3D cosmetic bottle studio renders and minimalist luxury social media art direction.",
        descAr: "ريندر استوديو ثلاثي الأبعاد لعبوات التجميل وإدارة فنية لحملات التواصل.",
        icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
      },
      {
        name: "Barq Express Logistics",
        sectorKey: "logistics",
        sectorLabelEn: "Smart Delivery & Fleet Solutions",
        sectorLabelAr: "حلول التوصيل الذكي والأساطيل",
        badgeEn: "Logistics",
        badgeAr: "خدمات لوجستية",
        countryEn: "Riyadh, Saudi Arabia",
        countryAr: "الرياض، السعودية",
        descEn: "Fleet branding wraps, 3D delivery box visuals, and fast-commerce promotional graphics.",
        descAr: "تصميم هوية أسطول المركبات وصناديق التوصيل ثلاثية الأبعاد والحملات الترويجية.",
        icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`
      },
      {
        name: "Mansoura Downtown & Eskan",
        sectorKey: "enterprise",
        sectorLabelEn: "Integrated Residential & Commercial",
        sectorLabelAr: "المجمعات السكنية والتجارية",
        badgeEn: "Landmark",
        badgeAr: "مشروع رائد",
        countryEn: "Mansoura, Egypt",
        countryAr: "المنصورة، مصر",
        descEn: "Brand identity, aqua park launch visuals, and large-scale 3D CGI outdoor building wraps.",
        descAr: "الهوية البصرية وحملات الأكوا بارك وإعلانات الأبراج المدمجة بتقنية 3D CGI.",
        icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`
      }
    ];

    const cmsCollectionSchemas = {
      experience: {
        title: "Experience",
        editorId: "cmsExperienceEditor",
        items: () => experienceData,
        fields: [
          ["company", "Company"],
          ["roleEn", "Role (EN)"],
          ["roleAr", "المسمى الوظيفي (AR)"],
          ["locationEn", "Location (EN)"],
          ["locationAr", "الموقع (AR)"],
          ["countryCode", "Country filter (KSA / Egypt)"],
          ["period", "Period"],
          ["summaryEn", "Description (EN)", "textarea"],
          ["summaryAr", "الوصف (AR)", "textarea"]
        ],
        create: () => ({ company: "", roleEn: "", roleAr: "", locationEn: "", locationAr: "", countryCode: "KSA", period: "", summaryEn: "", summaryAr: "" }),
        heading: (item) => item.company || "New experience"
      },
      software: {
        title: "Software skill",
        editorId: "cmsSoftwareEditor",
        items: () => softwareList,
        fields: [
          ["code", "Short label"],
          ["name", "Software"],
          ["level", "Skill level (%)", "number"],
          ["roleEn", "Description (EN)", "textarea"],
          ["roleAr", "الوصف (AR)", "textarea"]
        ],
        create: () => ({ code: "", name: "", level: 80, roleEn: "", roleAr: "" }),
        heading: (item) => item.name || "New software skill"
      },
      expertise: {
        title: "Expertise",
        editorId: "cmsExpertiseEditor",
        items: () => expertiseTags,
        fields: [["en", "Expertise (EN)"], ["ar", "التخصص (AR)"]],
        create: () => ({ en: "", ar: "" }),
        heading: (item) => item.en || item.ar || "New expertise"
      },
      partner: {
        title: "Partner",
        editorId: "cmsPartnerEditor",
        items: () => partnersData,
        fields: [
          ["name", "Partner name"],
          ["sectorKey", "Sector key"],
          ["sectorLabelEn", "Sector (EN)"],
          ["sectorLabelAr", "القطاع (AR)"],
          ["badgeEn", "Badge (EN)"],
          ["badgeAr", "الشارة (AR)"],
          ["countryEn", "Location (EN)"],
          ["countryAr", "الموقع (AR)"],
          ["descEn", "Description (EN)", "textarea"],
          ["descAr", "الوصف (AR)", "textarea"]
        ],
        create: () => ({ name: "", sectorKey: partnerSectors[0]?.key || "enterprise", sectorLabelEn: "", sectorLabelAr: "", badgeEn: "", badgeAr: "", countryEn: "", countryAr: "", descEn: "", descAr: "", icon: partnersData[0]?.icon || "" }),
        heading: (item) => item.name || "New partner"
      },
      partnerSector: {
        title: "Partner sector",
        editorId: "cmsPartnerSectorEditor",
        items: () => partnerSectors,
        fields: [["key", "Sector key (unique)"], ["en", "Name (EN)"], ["ar", "الاسم (AR)"]],
        create: () => ({ key: "", en: "", ar: "" }),
        heading: (item) => item.en || item.ar || "New sector"
      },
      partnerStat: {
        title: "Partner statistic",
        editorId: "cmsPartnerStatsEditor",
        items: () => partnerStats,
        fields: [["value", "Value"], ["labelEn", "Label (EN)"], ["labelAr", "التسمية (AR)"], ["subEn", "Caption (EN)"], ["subAr", "الوصف (AR)"]],
        create: () => ({ value: "", labelEn: "", labelAr: "", subEn: "", subAr: "" }),
        heading: (item) => item.labelEn || item.labelAr || "New statistic"
      },
      resumeStat: {
        title: "Resume statistic",
        editorId: "cmsResumeStatsEditor",
        items: () => resumeStats,
        fields: [["value", "Value"], ["labelEn", "Label (EN)"], ["labelAr", "التسمية (AR)"], ["subEn", "Caption (EN)"], ["subAr", "الوصف (AR)"]],
        create: () => ({ value: "", labelEn: "", labelAr: "", subEn: "", subAr: "", icon: resumeStats[0]?.icon || "" }),
        heading: (item) => item.labelEn || item.labelAr || "New statistic"
      },
      aboutStat: {
        title: "About statistic",
        editorId: "cmsAboutStatsEditor",
        items: () => aboutStats,
        fields: [["value", "Value"], ["labelEn", "Label (EN)"], ["labelAr", "التسمية (AR)"], ["subEn", "Caption (EN)"], ["subAr", "الوصف (AR)"]],
        create: () => ({ value: "", labelEn: "", labelAr: "", subEn: "", subAr: "" }),
        heading: (item) => item.labelEn || item.labelAr || "New statistic"
      },
      aboutPillar: {
        title: "About section",
        editorId: "cmsAboutPillarsEditor",
        items: () => aboutPillars,
        fields: [["titleEn", "Title (EN)"], ["titleAr", "العنوان (AR)"], ["descEn", "Description (EN)", "textarea"], ["descAr", "الوصف (AR)", "textarea"]],
        create: () => ({ titleEn: "", titleAr: "", descEn: "", descAr: "", icon: aboutPillars[0]?.icon || "" }),
        heading: (item) => item.titleEn || item.titleAr || "New section"
      },
      aboutTag: {
        title: "About tag",
        editorId: "cmsAboutTagsEditor",
        items: () => aboutTags,
        fields: [["value", "Tag"]],
        create: () => ({ value: "" }),
        heading: (item) => item.value || "New tag"
      }
    };

    function escapeCmsHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
      })[char]);
    }

    function renderCmsCollectionEditor(collectionKey, containerId) {
      const schema = cmsCollectionSchemas[collectionKey];
      const container = document.getElementById(containerId);
      if (!schema || !container) return;
      const items = schema.items();

      container.innerHTML = `
        <div class="space-y-4">
          ${items.map((item, index) => `
            <article class="ios-subcard rounded-2xl p-4">
              <div class="mb-3 flex items-center justify-between gap-3">
                <h4 class="truncate text-sm font-bold text-obsidian">${escapeCmsHtml(schema.heading(item))}</h4>
                <button type="button" onclick="removeCmsCollectionItem('${collectionKey}', ${index})" class="shrink-0 rounded-full bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-500/20">Remove</button>
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                ${schema.fields.map(([field, label, type]) => `
                  <label class="block text-[11px] font-semibold text-obsidian">
                    ${label}
                    ${type === "textarea"
                      ? `<textarea rows="2" oninput="updateCmsCollectionField('${collectionKey}', ${index}, '${field}', this.value)" class="mt-1 w-full rounded-xl border border-white bg-white/85 px-3 py-2 text-xs font-normal">${escapeCmsHtml(item[field])}</textarea>`
                      : `<input type="${type || "text"}" ${type === "number" ? 'min="0" max="100"' : ""} value="${escapeCmsHtml(item[field])}" oninput="updateCmsCollectionField('${collectionKey}', ${index}, '${field}', this.value)" class="mt-1 w-full rounded-xl border border-white bg-white/85 px-3 py-2 text-xs font-normal" />`}
                  </label>
                `).join("")}
              </div>
            </article>
          `).join("")}
          ${items.length === 0 ? '<p class="rounded-xl bg-white/60 p-4 text-sm text-slateText">No entries yet. Add one to get started.</p>' : ""}
        </div>
      `;
    }

    function updateCmsCollectionField(collectionKey, index, field, value) {
      const schema = cmsCollectionSchemas[collectionKey];
      const item = schema?.items()[index];
      if (!item || !schema.fields.some(([key]) => key === field)) return;
      const type = schema.fields.find(([key]) => key === field)?.[2];
      item[field] = type === "number" ? Number(value) : value;
    }

    function addCmsCollectionItem(collectionKey) {
      const schema = cmsCollectionSchemas[collectionKey];
      if (!schema) return;
      schema.items().push(schema.create());
      renderCmsCollectionEditor(collectionKey, schema.editorId);
    }

    function removeCmsCollectionItem(collectionKey, index) {
      const schema = cmsCollectionSchemas[collectionKey];
      if (!schema || !schema.items()[index]) return;
      if (!window.confirm(`Remove this ${schema.title.toLowerCase()}?`)) return;
      schema.items().splice(index, 1);
      renderCmsCollectionEditor(collectionKey, schema.editorId);
    }

    function renderCmsPageEditors() {
      const editorIds = {
        experience: "cmsExperienceEditor",
        software: "cmsSoftwareEditor",
        expertise: "cmsExpertiseEditor",
        partner: "cmsPartnerEditor",
        partnerSector: "cmsPartnerSectorEditor",
        partnerStat: "cmsPartnerStatsEditor",
        resumeStat: "cmsResumeStatsEditor",
        aboutStat: "cmsAboutStatsEditor",
        aboutPillar: "cmsAboutPillarsEditor",
        aboutTag: "cmsAboutTagsEditor"
      };
      Object.entries(editorIds).forEach(([key, id]) => renderCmsCollectionEditor(key, id));

      ["degreeEn", "degreeAr", "universityEn", "universityAr", "period"].forEach((field) => {
        const input = document.getElementById(`cmsEducation${field[0].toUpperCase()}${field.slice(1)}`);
        if (input) input.value = educationData[field] || "";
      });
    }

    async function saveCmsPageCollections(sectionName) {
      if (sectionName === "resume" && softwareList.some((item) => !Number.isFinite(item.level) || item.level < 0 || item.level > 100)) {
        showCmsToast("Software skill levels must be numbers from 0 to 100.");
        return;
      }
      if (sectionName === "partners") {
        const sectorKeys = partnerSectors.map((sector) => String(sector.key ?? "").trim());
        if (sectorKeys.some((key) => !/^[a-z0-9_-]+$/i.test(key)) || new Set(sectorKeys).size !== sectorKeys.length) {
          showCmsToast("Partner sector keys may use letters, numbers, dashes, and underscores only, and must be unique.");
          return;
        }
        if (partnersData.some((partner) => !sectorKeys.includes(String(partner.sectorKey ?? "").trim()))) {
          showCmsToast("Each partner must use one of the saved sector keys.");
          return;
        }
        partnerSectors.forEach((sector, index) => {
          sector.key = sectorKeys[index];
        });
        partnersData.forEach((partner) => {
          partner.sectorKey = String(partner.sectorKey).trim();
        });
        if (partnersSectorFilter !== "ALL" && !sectorKeys.includes(partnersSectorFilter)) {
          partnersSectorFilter = "ALL";
        }
      }
      if (sectionName === "resume") renderResumeContent();
      if (sectionName === "partners") renderPartnersContent();
      if (sectionName === "about") renderAboutContent();
      if (await saveCmsState()) showCmsToast(`${sectionName} page changes published.`);
    }

    async function saveCmsEducation() {
      ["degreeEn", "degreeAr", "universityEn", "universityAr", "period"].forEach((field) => {
        const input = document.getElementById(`cmsEducation${field[0].toUpperCase()}${field.slice(1)}`);
        if (input) educationData[field] = input.value.trim();
      });
      renderResumeContent();
      if (await saveCmsState()) showCmsToast("Education details published.");
    }

    let portfolioProjects = [
      {
        id: 1,
        titleEn: "Silvage Medical Branding",
        titleAr: "هوية علامة سالفج الطبية",
        categoryEn: "Branding",
        categoryAr: "هوية بصرية",
        client: "Silvage Medical",
        year: "2025",
        location: "Saudi Arabia",
        locationAr: "المملكة العربية السعودية",
        roleEn: "Lead Brand Designer",
        roleAr: "مصمم هوية رئيسي",
        tools: ["Adobe Illustrator", "Adobe Photoshop", "Brand Guidelines"],
        deliverablesEn: "Brand Identity, Logo System, Medical Visuals, Stationery",
        deliverablesAr: "هوية بصرية متكاملة، نظام الشعار، المطبوعات الطبية",
        descriptionEn: "Complete brand architecture and visual identity for Silvage in the Saudi medical field, combining clinical trust with modern minimalism.",
        descriptionAr: "بناء الهوية البصرية الكاملة لشركة سالفج العاملة في القطاع الطبي بالمملكة العربية السعودية، بأسلوب يجمع بين الثقة الطبية والحداثة.",
        challengeEn: "Creating a distinctive, trustworthy medical identity that stands out in the Saudi healthcare supply sector while remaining clean across digital and clinical packaging.",
        challengeAr: "ابتكار هوية طبية موثوقة ومتميزة في قطاع الإمدادات الطبية السعودي مع الحفاظ على وضوحها عبر العبوات والمنصات الرقمية.",
        solutionEn: "Developed a geometric emblem paired with a calm clinical color palette, modular typography, and strict brand usage guidelines.",
        solutionAr: "تصميم رمز هندسي دقيق مع لوحة ألوان طبية هادئة ونظام خطوط متناسق ودليل إرشادي شامل لتطبيقات الهوية.",
        imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85",
        gallery: [
          "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&w=800&q=80"
        ]
      },
      {
        id: 2,
        titleEn: "Mansoura Downtown Compound",
        titleAr: "داون تاون المنصورة العقارية",
        categoryEn: "Logo & Social Media",
        categoryAr: "لوجو وسوشيال ميديا",
        client: "Mansoura Downtown",
        year: "2024",
        location: "Mansoura, Egypt",
        locationAr: "المنصورة، مصر",
        roleEn: "Senior Visual & Campaign Designer",
        roleAr: "مصمم هويات وحملات أول",
        tools: ["Adobe Illustrator", "Adobe Photoshop", "After Effects"],
        deliverablesEn: "Branding, Social Media Campaigns, Aqua Park Launch Visuals",
        deliverablesAr: "هوية بصرية، حملات سوشيال ميديا، إطلاق أكوا بارك",
        descriptionEn: "Brand identity and digital campaigns for the first real residential compound and aqua park in Mansoura offering integrated lifestyle services.",
        descriptionAr: "تصميم الهوية والحملات الإعلانية لأول كمبوند سكني حقيقي وأكوا بارك في المنصورة يقدم خدمات متكاملة بلا حدود.",
        challengeEn: "Positioning a landmark mixed-use residential and entertainment destination to attract families and investors across the Delta region.",
        challengeAr: "إبراز المشروع كأول وجهة سكنية وترفيهية متكاملة في المنصورة لجذب العائلات والمستثمرين في منطقة الدلتا.",
        solutionEn: "Crafted an architectural crest logo and high-impact seasonal campaign visuals highlighting luxury living and family recreation.",
        solutionAr: "تصميم شعار معماري فخم وحملات إعلانية متكاملة تبرز رفاهية السكن وتجربة الأكوا بارك والخدمات المتكاملة.",
        imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=85",
        gallery: [
          "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
        ]
      },
      {
        id: 3,
        titleEn: "Perfect Sport Club",
        titleAr: "نادي بيرفكت الرياضي",
        categoryEn: "Rebranding",
        categoryAr: "إعادة بناء الهوية",
        client: "Perfect Sport Club",
        year: "2022",
        location: "Talkha, Egypt",
        locationAr: "طلخا، مصر",
        roleEn: "Branding & Sports Campaign Designer",
        roleAr: "مصمم هويات وحملات رياضية",
        tools: ["Adobe Illustrator", "Adobe Photoshop"],
        deliverablesEn: "Rebranding, Gymnastics, Judo & Squash Academy Campaigns",
        deliverablesAr: "إعادة بناء الهوية، حملات الجمباز والجودو والسكواش",
        descriptionEn: "Complete rebranding and sports promotional campaigns for gymnastics, judo, and squash academies.",
        descriptionAr: "إعادة تصميم الهوية البصرية والحملات الترويجية لأكاديميات الجمباز والجودو والسكواش بنادي بيرفكت الرياضي.",
        challengeEn: "Modernizing an established multi-sport club identity to energize youth enrollments across diverse athletic disciplines.",
        challengeAr: "تحديث هوية النادي الرياضي العريق بصورة عصرية حماسية لزيادة اشتراكات الناشئين في مختلف الألعاب الفردية.",
        solutionEn: "Built a dynamic athletic visual language with bold typography, energetic lighting compositions, and unified academy sub-badges.",
        solutionAr: "بناء لغة بصرية رياضية ديناميكية بخطوط قوية وإضاءة حماسية وشعارات فرعية موحدة لكل أكاديمية رياضية.",
        imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=85",
        gallery: [
          "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80"
        ]
      },
      {
        id: 4,
        titleEn: "Dr. Mahmoud Fertility Clinic",
        titleAr: "عيادة د. محمود للحقن المجهري",
        categoryEn: "Social Media Design",
        categoryAr: "تصميم السوشيال ميديا",
        client: "Dr. Mahmoud Clinic",
        year: "2024",
        location: "Egypt",
        locationAr: "مصر",
        roleEn: "Medical Visual & Social Designer",
        roleAr: "مصمم محتوى طبي وسوشيال ميديا",
        tools: ["Adobe Photoshop", "Adobe Illustrator"],
        deliverablesEn: "Medical Infographics, IVF & 4D Ultrasound Campaigns",
        deliverablesAr: "إنفوجرافيك طبي، حملات الحقن المجهري والسونار رباعي الأبعاد",
        descriptionEn: "Educational and promotional social media campaigns covering IVF, safe pregnancy, and maternal healthcare.",
        descriptionAr: "حملات توعوية وإعلانية متخصصة للحمل الآمن، الحقن المجهري، ومتابعة سكر الحمل والسونار رباعي الأبعاد.",
        challengeEn: "Communicating sensitive medical procedures with warmth, clarity, and scientific credibility for expectant families.",
        challengeAr: "تبسيط المعلومات الطبية الدقيقة وتقديمها بأسلوب بصري دافئ ومطمئن يجمع بين المصداقية العلمية والوضوح.",
        solutionEn: "Designed calm pastel-toned visual series, clear medical infographics, and patient-focused awareness posts.",
        solutionAr: "تصميم سلسلة بصرية بألوان هادئة ومريحة للعين مع إنفوجرافيك مبسط ومنشورات توعوية تعزز ثقة المرضى.",
        imageUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=900&q=85",
        gallery: [
          "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=800&q=80"
        ]
      },
      {
        id: 5,
        titleEn: "Al Hazmi Real Estate",
        titleAr: "شركة الحازمي العقارية",
        categoryEn: "3D Work & Logo",
        categoryAr: "أعمال 3D وشعار",
        client: "Al Hazmi Co.",
        year: "2024",
        location: "Saudi Arabia",
        locationAr: "المملكة العربية السعودية",
        roleEn: "3D Visualization & Brand Designer",
        roleAr: "مصمم هوية وإظهار معماري 3D",
        tools: ["Blender 3D", "Adobe Illustrator", "Adobe Photoshop"],
        deliverablesEn: "Corporate Logo & 3D Architectural Visualization",
        deliverablesAr: "تصميم الشعار والريندر المعماري ثلاثي الأبعاد",
        descriptionEn: "Corporate visual identity and photorealistic 3D architectural visualization for Al Hazmi Real Estate in KSA.",
        descriptionAr: "تصميم الهوية البصرية والريندر المعماري ثلاثي الأبعاد لشركة الحازمي العقارية في السعودية.",
        challengeEn: "Delivering an authoritative Saudi real estate corporate brand alongside realistic 3D exterior renders prior to construction.",
        challengeAr: "تقديم هوية عقارية سعودية رصينة مع إظهار معماري ثلاثي الأبعاد واقعي للمشاريع قبل اكتمال التنفيذ.",
        solutionEn: "Combined a monogram logo inspired by architectural geometry with sunlit 3D exterior renders in Blender.",
        solutionAr: "دمج شعار هندسي مستوحى من الخطوط المعمارية مع لقطات ريندر خارجية واقعية بإضاءة طبيعية عبر برنامج Blender.",
        imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=85",
        gallery: [
          "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80"
        ]
      },
      {
        id: 6,
        titleEn: "Al Amal Real Estate UI Design",
        titleAr: "تصميم واجهة تطبيق الأمل العقارية",
        categoryEn: "UI Design",
        categoryAr: "تصميم واجهات المستخدم UI",
        client: "Al Amal Real Estate",
        year: "2024",
        location: "Egypt",
        locationAr: "مصر",
        roleEn: "UI/UX Visual Designer",
        roleAr: "مصمم واجهات مستخدم UI",
        tools: ["Figma", "Adobe Illustrator", "Adobe Photoshop"],
        deliverablesEn: "UI/UX Interface Design, Real Estate App Screens, Interactive Prototype",
        deliverablesAr: "تصميم واجهات تطبيقات الهواتف الذكية للقطاع العقاري",
        descriptionEn: "Modern user interface design for Al Amal Real Estate mobile platform showcasing residential towers and unit availability.",
        descriptionAr: "تصميم واجهة مستخدم حديثة لمنصة الأمل العقارية لعرض الأبراج السكنية والمشاريع العقارية وتفاصيل الوحدات.",
        challengeEn: "Simplifying property browsing, installment calculators, and floor-plan comparisons on mobile screens.",
        challengeAr: "تبسيط تجربة تصفح الوحدات العقارية وحاسبة الأقساط ومقارنة المخططات الهندسية على شاشات الهواتف الذكية.",
        solutionEn: "Designed a clean card-based UI system with intuitive filters, high-contrast typography, and streamlined inquiry flows.",
        solutionAr: "تصميم واجهة عصرية تعتمد على البطاقات المرنة وفلاتر البحث الذكية وتجربة تصفح سلسة وسريعة.",
        imageUrl: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=900&q=85",
        gallery: [
          "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=800&q=80"
        ]
      },
      {
        id: 7,
        titleEn: "Hempel Industrial & Decorative Paints",
        titleAr: "دهانات همبل أبحر",
        categoryEn: "Social Media & 3D Product",
        categoryAr: "سوشيال ميديا ومنتجات 3D",
        client: "Hempel Obhour",
        year: "2023",
        location: "Jeddah, KSA",
        locationAr: "جدة، السعودية",
        roleEn: "3D Product & Campaign Designer",
        roleAr: "مصمم منتجات 3D وحملات إعلانية",
        tools: ["Blender 3D", "Adobe Substance", "Adobe Photoshop"],
        deliverablesEn: "3D Paint Gallons, Contex & Casa Rustica Campaigns",
        deliverablesAr: "ريندر 3D لعبوات الدهان، حملات كونتكس وكازا رستيكا",
        descriptionEn: "Photorealistic 3D product renders and social media campaigns for Hempel protective and decorative coatings in Jeddah.",
        descriptionAr: "نمذجة ثلاثية الأبعاد لعبوات دهانات همبل وحملات إعلانية لمنتجات كونتكس وكازا رستيكا في أبحر الشمالية بجدة.",
        challengeEn: "Showcasing both heavy-duty protective coatings and luxury decorative wall textures with accurate material reflections.",
        challengeAr: "إبراز جودة الدهانات الإنشائية والديكورية وتأثير ملمس الخامات على الجدران بدقة بصرية عالية.",
        solutionEn: "Modeled exact 3D paint cans with PBR metallic/matte shaders in Blender & Substance paired with rich interior scenes.",
        solutionAr: "نمذجة عبوات الدهان بدقة واقعية مع محاكاة خامات المعادن والطلاء في Blender و Substance ضمن مشاهد ديكورية متكاملة.",
        imageUrl: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=85",
        gallery: [
          "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80"
        ]
      },
      {
        id: 8,
        titleEn: "3D CGI & Outdoor Billboard VFX",
        titleAr: "أعمال 3D CGI وإعلانات الشوارع المدمجة",
        categoryEn: "3D CGI & VFX",
        categoryAr: "خدع بصرية ودمج 3D CGI",
        client: "Eskan Elmansoura / Automotive / Smart Home",
        year: "2024",
        location: "KSA & Egypt",
        locationAr: "السعودية ومصر",
        roleEn: "3D CGI & Compositing Artist",
        roleAr: "فنان 3D CGI ودمج بصري",
        tools: ["Blender 3D", "After Effects", "Adobe Photoshop"],
        deliverablesEn: "CGI Building Wraps, 360° Smart Camera 3D, Automotive Renders",
        deliverablesAr: "دمج إعلانات الأبراج CGI، كاميرا ذكية 360°، ريندر سيارات",
        descriptionEn: "Photorealistic CGI architectural banners for Al Badry Towers & City Center, 360° smart camera clay-to-final renders, and automotive lighting.",
        descriptionAr: "دمج بصري ثلاثي الأبعاد لإعلانات أبراج البدري وسيتي سنتر بالمنصورة، ونمذجة كاميرا المراقبة الذكية وريندر السيارات الواقعي.",
        challengeEn: "Matching real-world camera perspective, daylight shadows, and fabric physics for large-scale outdoor CGI integrations.",
        challengeAr: "مطابقة منظور الكاميرا الواقعي وظلال الإضاءة الطبيعية وحركة الخامات لدمج الإعلانات الضخمة على واجهات الأبراج.",
        solutionEn: "Executed camera tracking, HDRI environment lighting, and multi-pass compositing for seamless photorealism.",
        solutionAr: "تطبيق تتبع الكاميرا وإضاءة HDRI الواقعية والدمج متعدد الطبقات لتحقيق واقعية بصرية كاملة.",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=85",
        gallery: [
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80"
        ]
      },
      {
        id: 9,
        titleEn: "Saudi Founding Day & Kidana Booths",
        titleAr: "منتجات يوم التأسيس وبوثات كدانة",
        categoryEn: "3D Product & Exhibition",
        categoryAr: "منتجات 3D وتصميم معارض",
        client: "P.Team & To Vision (Kidana)",
        year: "2025",
        location: "Saudi Arabia",
        locationAr: "المملكة العربية السعودية",
        roleEn: "3D Exhibition & Product Designer",
        roleAr: "مصمم معارض ومنتجات 3D",
        tools: ["Blender 3D", "Adobe Substance", "Adobe Illustrator"],
        deliverablesEn: "Saudi Founding Day 2025 3D Gifts, Kidana Ramadan Wayfinding",
        deliverablesAr: "توزيعات يوم التأسيس 2025، قوالب إرشادية لموقع إفطار كدانة",
        descriptionEn: "3D modeling for Saudi Founding Day 2025 corporate gifts and modular Ramadan wayfinding banners for Kidana.",
        descriptionAr: "تنفيذ جميع منتجات وتوزيعات يوم التأسيس 2025 بالنمذجة ثلاثية الأبعاد، وتصميم 3 خيارات لقوالب إرشادية لموقع إفطار رمضاني لشركة كدانة.",
        challengeEn: "Blending authentic Saudi heritage motifs with functional, modular crowd-wayfinding structures and corporate gift packaging.",
        challengeAr: "دمج الزخارف التراثية السعودية الأصيلة مع تصاميم لوحات إرشادية عملية وتوزيعات مؤسسية فاخرة ليوم التأسيس.",
        solutionEn: "Created production-ready 3D prototypes with traditional patterns, accurate dimensions, and nighttime lighting previews.",
        solutionAr: "إعداد نماذج ثلاثية الأبعاد جاهزة للتصنيع بزخارف تراثية وأبعاد هندسية دقيقة مع محاكاة الإضاءة الليلية.",
        imageUrl: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=900&q=85",
        gallery: [
          "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80"
        ]
      }
    ];

    const defaultCmsContentData = JSON.parse(JSON.stringify({
      projects: portfolioProjects,
      experience: experienceData,
      software: softwareList,
      education: educationData,
      expertise: expertiseTags,
      partners: partnersData,
      partnerSectors,
      partnerStats,
      resumeStats,
      aboutStats,
      aboutPillars,
      aboutTags
    }));

    function restoreCmsContentDefaults() {
      const defaults = JSON.parse(JSON.stringify(defaultCmsContentData));
      portfolioProjects = defaults.projects;
      experienceData = defaults.experience;
      softwareList = defaults.software;
      educationData = defaults.education;
      expertiseTags = defaults.expertise;
      partnersData = defaults.partners;
      partnerSectors = defaults.partnerSectors;
      partnerStats = defaults.partnerStats;
      resumeStats = defaults.resumeStats;
      aboutStats = defaults.aboutStats;
      aboutPillars = defaults.aboutPillars;
      aboutTags = defaults.aboutTags;
    }

    let cardElements = [];
    let virtualIndex = 0;
    let targetIndex = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartTarget = 0;
    let dragMoved = false;
    let isStageHovered = false;
    let pointerDownCardId = null;

    // ==================== CAROUSEL & PROJECT BROWSING ====================
    function getNextProjectId() {
      return portfolioProjects.reduce((max, project) => Math.max(max, Number(project.id) || 0), 0) + 1;
    }

    function wrapIndex(idx, len) { return ((idx % len) + len) % len; }
    function shortestDelta(index, center, len) {
      let d = index - center;
      while (d > len / 2) d -= len;
      while (d < -len / 2) d += len;
      return d;
    }

    function buildCarouselCards() {
      const stage = document.getElementById("carouselStage");
      if (!stage) return;
      stage.innerHTML = "";
      cardElements = [];

      portfolioProjects.forEach((proj, index) => {
        const card = document.createElement("article");
        card.className = "carousel-card group";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.dataset.projectId = String(proj.id);
        const title = currentLang === "ar" ? proj.titleAr : proj.titleEn;
        const cat = currentLang === "ar" ? proj.categoryAr : proj.categoryEn;
        const isRecommended = getProjectMatchScore(proj) > 0;
        const recLabel = currentLang === "ar" ? "★ مقترح لك" : "★ For You";

        card.innerHTML = `
          <div class="card-inner">
            <img src="${proj.imageUrl}" alt="${title}" loading="${index === 0 ? "eager" : "lazy"}" decoding="async" fetchpriority="${index === 0 ? "high" : "auto"}" />
            ${isRecommended ? `
              <div class="absolute top-3.5 start-3.5 px-2.5 py-1 rounded-full bg-[#111214]/85 backdrop-blur-md border border-white/30 text-[10px] font-bold text-white shadow-sm pointer-events-none">
                ${recLabel}
              </div>
            ` : ""}
            <!-- Permanent Frosted Glass Title & Category Caption -->
            <div class="absolute inset-x-0 bottom-0 pt-14 pb-4 px-4 bg-gradient-to-t from-black/85 via-black/45 to-transparent text-white transition-all duration-300 pointer-events-none">
              <div class="flex items-center justify-between gap-2 mb-1">
                <span class="inline-block px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-[10px] font-semibold uppercase tracking-wider text-white/95">${cat}</span>
                <span class="text-[10px] font-mono text-white/75">${String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3 class="text-sm sm:text-base font-bold leading-snug text-white drop-shadow-sm line-clamp-1">${title}</h3>
            </div>
          </div>
        `;

        card.addEventListener("pointerdown", () => {
          pointerDownCardId = proj.id;
        });

        card.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!dragMoved) {
            openProjectPage(proj.id);
          }
        });

        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openProjectPage(proj.id);
          }
        });

        stage.appendChild(card);
        cardElements.push(card);
      });
    }

    function detectCardAtPoint(clientX, clientY) {
      const elements = document.elementsFromPoint(clientX, clientY);
      for (const el of elements) {
        const card = el.closest && el.closest(".carousel-card");
        if (card && card.dataset.projectId) {
          return Number(card.dataset.projectId);
        }
      }
      return null;
    }

    function renderCarouselFrame() {
      const homeView = document.getElementById("homePortfolioView");
      const isHomeVisible = homeView && !homeView.classList.contains("hidden");

      if (isHomeVisible && cardElements.length > 0) {
        if (!isDragging && !isStageHovered) targetIndex += 0.0022;
        virtualIndex += (targetIndex - virtualIndex) * 0.08;
        const total = portfolioProjects.length;
        const vw = window.innerWidth;

        // Strong cylindrical concave perspective: small recessed center, large angled sides
        const radius = Math.max(660, vw * 0.46);
        const cardWidth = 300;
        const minChordAngle = 2 * Math.asin(cardWidth / (2 * radius));
        const angleStep = minChordAngle + 0.022;

        for (let i = 0; i < total; i++) {
          const card = cardElements[i];
          const d = shortestDelta(i, virtualIndex, total);
          const absD = Math.abs(d);

          if (absD > 4.2) {
            card.style.opacity = "0";
            card.style.pointerEvents = "none";
            continue;
          }

          card.style.opacity = "1";
          card.style.pointerEvents = "auto";

          const theta = d * angleStep;
          const xPos = Math.sin(theta) * radius;
          // Deep center recess (-460px) and strong forward sweep on sides
          const zPos = (1 - Math.cos(theta)) * radius - 460;
          const rotateYDeg = (-theta * 180) / Math.PI;

          card.style.transform = `translate3d(${xPos.toFixed(2)}px, 0px, ${zPos.toFixed(2)}px) rotateY(${rotateYDeg.toFixed(2)}deg)`;
          card.style.zIndex = Math.round(100 + (1 - Math.cos(theta)) * 200);
        }
      }
      requestAnimationFrame(renderCarouselFrame);
    }

    // ==================== PAGE CONTENT & NAVIGATION ====================
    function setResumeCountry(filter) {
      resumeCountryFilter = filter;
      renderResumeContent();
    }

    function renderResumeContent() {
      const container = document.getElementById("resumeDynamicContainer");
      if (!container) return;
      const isAr = currentLang === "ar";
      const filteredExp = resumeCountryFilter === "ALL"
        ? experienceData
        : experienceData.filter((item) => item.countryCode === resumeCountryFilter);
      const ksaCount = experienceData.filter((item) => item.countryCode === "KSA").length;
      const egyptCount = experienceData.filter((item) => item.countryCode === "Egypt").length;

      container.innerHTML = `
        <div class="glass-card inner-anim-card rounded-[32px] p-6 sm:p-10" style="animation-delay: 0.04s">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div class="inner-anim-text" style="animation-delay: 0.12s">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 text-xs font-semibold text-[#111214] mb-3 shadow-sm">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>${isAr ? "السيرة الذاتية التنفيذية • 2026" : "Executive Curriculum Vitae • 2026"}</span>
              </div>
              <h2 class="text-2xl sm:text-4xl font-bold text-[#111214] tracking-tight">
                ${escapeCmsHtml(isAr ? cmsConfig.resumeTitleAr : cmsConfig.resumeTitleEn)}
              </h2>
              <p class="mt-2 text-xs sm:text-sm text-[#5A5C60] max-w-2xl leading-relaxed">
                ${escapeCmsHtml(isAr ? cmsConfig.resumeIntroAr : cmsConfig.resumeIntroEn)}
              </p>
            </div>
            <div class="flex flex-wrap gap-2 inner-anim-text" style="animation-delay: 0.18s">
              <button type="button" onclick="setResumeCountry('ALL')" class="px-4 py-2 rounded-full text-xs font-semibold transition-all ${resumeCountryFilter === 'ALL' ? 'bg-[#111214] text-white shadow' : 'bg-white/80 text-[#5A5C60] hover:text-[#111214]'}">
                ${isAr ? `الكل (${experienceData.length})` : `All Markets (${experienceData.length})`}
              </button>
              <button type="button" onclick="setResumeCountry('KSA')" class="px-4 py-2 rounded-full text-xs font-semibold transition-all ${resumeCountryFilter === 'KSA' ? 'bg-[#111214] text-white shadow' : 'bg-white/80 text-[#5A5C60] hover:text-[#111214]'}">
                ${isAr ? `السعودية (${ksaCount})` : `Saudi Arabia (${ksaCount})`}
              </button>
              <button type="button" onclick="setResumeCountry('Egypt')" class="px-4 py-2 rounded-full text-xs font-semibold transition-all ${resumeCountryFilter === 'Egypt' ? 'bg-[#111214] text-white shadow' : 'bg-white/80 text-[#5A5C60] hover:text-[#111214]'}">
                ${isAr ? `مصر (${egyptCount})` : `Egypt (${egyptCount})`}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            ${resumeStats.map((st, idx) => `
              <div class="ios-subcard inner-anim-card rounded-2xl p-5 flex items-start gap-4" style="animation-delay: ${(0.18 + idx * 0.06).toFixed(2)}s">
                <div class="w-11 h-11 rounded-xl bg-[#111214] text-white flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                  ${st.icon}
                </div>
                <div>
                  <div class="text-2xl font-bold text-[#111214] leading-none">${escapeCmsHtml(st.value)}</div>
                  <div class="text-xs font-semibold text-[#111214] mt-1.5">${escapeCmsHtml(isAr ? st.labelAr : st.labelEn)}</div>
                  <div class="text-[11px] text-[#5A5C60] mt-0.5">${escapeCmsHtml(isAr ? st.subAr : st.subEn)}</div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-7 glass-card inner-anim-card rounded-[32px] p-6 sm:p-8" style="animation-delay: 0.22s">
            <div class="flex items-center gap-3 mb-6 inner-anim-text" style="animation-delay: 0.26s">
              <div class="w-9 h-9 rounded-xl bg-[#111214] text-white flex items-center justify-center">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </div>
              <h3 class="text-lg sm:text-xl font-bold text-[#111214]">
                ${isAr ? "المسيرة المهنية والخبرات" : "Professional Experience Timeline"}
              </h3>
            </div>

            <div class="relative border-s-2 border-[#111214]/15 ps-6 space-y-6 ms-2">
              ${filteredExp.map((exp, idx) => `
                <div class="relative ios-subcard inner-anim-card rounded-2xl p-4 sm:p-5" style="animation-delay: ${(0.28 + idx * 0.05).toFixed(2)}s">
                  <span class="absolute -start-[31px] top-6 w-3.5 h-3.5 rounded-full bg-[#111214] ring-4 ring-white"></span>
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <h4 class="text-sm sm:text-base font-bold text-[#111214]">${escapeCmsHtml(isAr ? exp.roleAr : exp.roleEn)}</h4>
                    <span class="px-3 py-1 rounded-full bg-[#111214]/5 text-[11px] font-semibold text-[#111214]">${escapeCmsHtml(exp.period)}</span>
                  </div>
                  <div class="flex flex-wrap items-center gap-3 text-xs font-medium text-[#5A5C60] mt-1">
                    <span class="text-[#111214] font-semibold">${escapeCmsHtml(exp.company)}</span>
                    <span>•</span>
                    <span>${escapeCmsHtml(isAr ? exp.locationAr : exp.locationEn)}</span>
                  </div>
                  <p class="text-xs text-[#45474A] mt-2.5 leading-relaxed">${escapeCmsHtml(isAr ? exp.summaryAr : exp.summaryEn)}</p>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="lg:col-span-5 space-y-6">
            <div class="glass-card inner-anim-card rounded-[32px] p-6 sm:p-8" style="animation-delay: 0.28s">
              <div class="flex items-center gap-3 mb-5 inner-anim-text" style="animation-delay: 0.32s">
                <div class="w-9 h-9 rounded-xl bg-[#111214] text-white flex items-center justify-center">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                </div>
                <h3 class="text-lg font-bold text-[#111214]">
                  ${isAr ? "البرامج والأدوات التقنية" : "Software & Technical Mastery"}
                </h3>
              </div>
              <div class="space-y-4">
                ${softwareList.map((sw, idx) => `
                  <div class="inner-anim-text" style="animation-delay: ${(0.34 + idx * 0.04).toFixed(2)}s">
                    <div class="flex items-center justify-between text-xs mb-1.5">
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded-md bg-[#111214] text-white font-bold text-[10px]">${escapeCmsHtml(sw.code)}</span>
                        <span class="font-semibold text-[#111214]">${escapeCmsHtml(sw.name)}</span>
                      </div>
                      <span class="font-bold text-[#111214]">${escapeCmsHtml(sw.level)}%</span>
                    </div>
                    <div class="w-full h-2 rounded-full bg-black/10 overflow-hidden">
                      <div class="h-full rounded-full bg-[#111214] inner-skill-bar" style="width: ${Math.min(100, Math.max(0, Number(sw.level) || 0))}%; animation-delay: ${(0.4 + idx * 0.05).toFixed(2)}s"></div>
                    </div>
                    <span class="block text-[10px] text-[#5A5C60] mt-1">${escapeCmsHtml(isAr ? sw.roleAr : sw.roleEn)}</span>
                  </div>
                `).join("")}
              </div>
            </div>

            <div class="glass-card inner-anim-card rounded-[32px] p-6 sm:p-8" style="animation-delay: 0.36s">
              <div class="flex items-center gap-3 mb-4 inner-anim-text" style="animation-delay: 0.4s">
                <div class="w-9 h-9 rounded-xl bg-[#111214] text-white flex items-center justify-center">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                </div>
                <h3 class="text-lg font-bold text-[#111214]">
                  ${isAr ? "التعليم ومجالات التخصص" : "Education & Core Expertise"}
                </h3>
              </div>
              <div class="p-4 rounded-2xl ios-subcard mb-5">
                <div class="text-xs font-bold text-[#111214]">${escapeCmsHtml(isAr ? educationData.degreeAr : educationData.degreeEn)}</div>
                <div class="text-xs text-[#5A5C60] mt-0.5">${escapeCmsHtml(isAr ? educationData.universityAr : educationData.universityEn)}</div>
                <span class="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-[#111214]/5 text-[11px] font-semibold text-[#111214]">${escapeCmsHtml(educationData.period)}</span>
              </div>
              <div class="flex flex-wrap gap-2">
                ${expertiseTags.map((tag, idx) => `
                  <span class="inner-anim-text px-3 py-1.5 rounded-full bg-white/85 border border-white text-xs font-medium text-[#111214] shadow-sm hover:-translate-y-0.5 transition-transform" style="animation-delay: ${(0.44 + idx * 0.03).toFixed(2)}s">
                    ${escapeCmsHtml(isAr ? tag.ar : tag.en)}
                  </span>
                `).join("")}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    function setPartnersSector(sector) {
      partnersSectorFilter = sector;
      renderPartnersContent();
    }

    function renderPartnersContent() {
      const container = document.getElementById("partnersDynamicContainer");
      if (!container) return;
      const isAr = currentLang === "ar";
      const filteredPartners = partnersSectorFilter === "ALL"
        ? partnersData
        : partnersData.filter((p) => p.sectorKey === partnersSectorFilter);

      const sectors = [{ key: "ALL", en: "All Partners", ar: "جميع الشركاء" }, ...partnerSectors];

      container.innerHTML = `
        <div class="glass-card inner-anim-card rounded-[32px] p-6 sm:p-10" style="animation-delay: 0.04s">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div class="inner-anim-text" style="animation-delay: 0.1s">
              <span class="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A5C60] mb-2">
                ${isAr ? "شركاء النجاح • السعودية والمنطقة" : "Partners of Success • KSA & Regional"}
              </span>
              <h2 class="text-2xl sm:text-4xl font-bold text-[#111214] tracking-tight">
                ${escapeCmsHtml(isAr ? cmsConfig.partnersTitleAr : cmsConfig.partnersTitleEn)}
              </h2>
            </div>
            <div class="flex flex-wrap gap-2 inner-anim-text" style="animation-delay: 0.16s">
              ${sectors.map(sec => `
                <button type="button" onclick="setPartnersSector('${sec.key}')" class="px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${partnersSectorFilter === sec.key ? 'bg-[#111214] text-white shadow' : 'bg-white/80 text-[#5A5C60] hover:text-[#111214]'}">
                  ${escapeCmsHtml(isAr ? sec.ar : sec.en)}
                </button>
              `).join("")}
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            ${partnerStats.map((st, idx) => `
              <div class="ios-subcard inner-anim-card rounded-2xl p-5" style="animation-delay: ${(0.18 + idx * 0.05).toFixed(2)}s">
                <div class="text-2xl font-bold text-[#111214]">${escapeCmsHtml(st.value)}</div>
                <div class="text-xs font-semibold text-[#111214] mt-1">${escapeCmsHtml(isAr ? st.labelAr : st.labelEn)}</div>
                <div class="text-[11px] text-[#5A5C60] mt-0.5">${escapeCmsHtml(isAr ? st.subAr : st.subEn)}</div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${filteredPartners.map((partner, idx) => `
            <article class="glass-card inner-anim-card rounded-[28px] p-6 flex flex-col justify-between group" style="animation-delay: ${(0.24 + idx * 0.05).toFixed(2)}s">
              <div>
                <div class="flex items-center justify-between gap-3 mb-4">
                  <div class="w-11 h-11 rounded-2xl bg-[#111214] text-white flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105">
                    ${partner.icon}
                  </div>
                  <span class="px-3 py-1 rounded-full bg-white text-[11px] font-semibold text-[#111214] border border-black/5">
                    ${escapeCmsHtml(isAr ? partner.badgeAr : partner.badgeEn)}
                  </span>
                </div>
                <h3 class="text-lg font-bold text-[#111214]">${escapeCmsHtml(partner.name)}</h3>
                <span class="block text-[11px] font-semibold text-[#5A5C60] mt-0.5">${escapeCmsHtml(isAr ? partner.sectorLabelAr : partner.sectorLabelEn)}</span>
                <p class="text-xs text-[#45474A] mt-3 leading-relaxed">${escapeCmsHtml(isAr ? partner.descAr : partner.descEn)}</p>
              </div>
              <div class="mt-5 pt-4 border-t border-black/5 flex items-center justify-between text-[11px] font-medium text-[#5A5C60]">
                <span>${escapeCmsHtml(isAr ? partner.countryAr : partner.countryEn)}</span>
                <span class="text-[#111214] font-semibold">${isAr ? "شريك نجاح معتمد" : "Verified Partner"}</span>
              </div>
            </article>
          `).join("")}
        </div>
      `;
    }

    function renderAboutContent() {
      const container = document.getElementById("aboutDynamicContainer");
      if (!container) return;
      const isAr = currentLang === "ar";

      container.innerHTML = `
        <div class="glass-card inner-anim-card rounded-[32px] p-6 sm:p-10" style="animation-delay: 0.04s">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div class="max-w-3xl inner-anim-text" style="animation-delay: 0.1s">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 text-xs font-semibold text-[#111214] mb-3 shadow-sm">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>${escapeCmsHtml(isAr ? cmsConfig.aboutStatusAr : cmsConfig.aboutStatusEn)}</span>
              </div>
              <h2 class="text-2xl sm:text-4xl font-bold text-[#111214] tracking-tight">
                ${escapeCmsHtml(isAr ? cmsConfig.aboutTitleAr : cmsConfig.aboutTitleEn)}
              </h2>
              <p class="mt-3 text-xs sm:text-sm text-[#45474A] leading-relaxed">
                ${escapeCmsHtml(isAr ? cmsConfig.aboutBioAr : cmsConfig.aboutBioEn)}
              </p>
              <div class="flex flex-wrap gap-2 mt-4">
                ${aboutTags.map((tag, idx) => `<span class="px-3 py-1 rounded-full ${idx === 0 ? "bg-[#111214] text-white" : "bg-white text-[#111214]"} text-[11px] font-semibold">#${escapeCmsHtml(tag.value)}</span>`).join("")}
              </div>
            </div>
            <div class="flex flex-wrap gap-3 shrink-0 inner-anim-text" style="animation-delay: 0.16s">
              <button type="button" onclick="switchPage('home')" class="px-5 py-3 rounded-full bg-[#111214] text-white text-xs font-semibold shadow hover:opacity-90 transition-all">
                ${isAr ? "استعرض الأعمال" : "Explore Works"}
              </button>
              <button type="button" onclick="switchPage('resume')" class="px-5 py-3 rounded-full bg-white text-[#111214] text-xs font-semibold shadow-sm hover:bg-white/90 transition-all">
                ${isAr ? "السيرة الذاتية" : "View Resume"}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            ${aboutStats.map((st, idx) => `
              <div class="ios-subcard inner-anim-card rounded-2xl p-5" style="animation-delay: ${(0.2 + idx * 0.05).toFixed(2)}s">
                <div class="text-2xl font-bold text-[#111214]">${escapeCmsHtml(st.value)}</div>
                <div class="text-xs font-semibold text-[#111214] mt-1">${escapeCmsHtml(isAr ? st.labelAr : st.labelEn)}</div>
                <div class="text-[11px] text-[#5A5C60] mt-0.5">${escapeCmsHtml(isAr ? st.subAr : st.subEn)}</div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          ${aboutPillars.map((pil, idx) => `
            <div class="glass-card inner-anim-card rounded-[28px] p-6 sm:p-7" style="animation-delay: ${(0.26 + idx * 0.06).toFixed(2)}s">
              <div class="w-11 h-11 rounded-2xl bg-[#111214] text-white flex items-center justify-center mb-4">
                ${pil.icon}
              </div>
              <h3 class="text-base sm:text-lg font-bold text-[#111214]">${escapeCmsHtml(isAr ? pil.titleAr : pil.titleEn)}</h3>
              <p class="text-xs sm:text-sm text-[#45474A] mt-2 leading-relaxed">${escapeCmsHtml(isAr ? pil.descAr : pil.descEn)}</p>
            </div>
          `).join("")}
        </div>
      `;
    }

    function switchPage(pageName, projectId = null) {
      if (pageName === "admin" && !isAdminAuthenticated) {
        openAdminLoginModal();
        return;
      }
      document.body.classList.toggle("admin-dashboard-active", pageName === "admin");
      const pages = {
        home: document.getElementById("homePortfolioView"),
        resume: document.getElementById("resumeView"),
        partners: document.getElementById("partnersView"),
        about: document.getElementById("aboutView"),
        project: document.getElementById("projectPageView"),
        admin: document.getElementById("adminDashboardView")
      };

      Object.entries(pages).forEach(([key, el]) => {
        if (!el) return;
        if (key === pageName) {
          el.classList.remove("hidden");
        } else {
          el.classList.add("hidden");
        }
      });

      const activeNavKey = pageName === "project" ? "home" : pageName;
      if (pageName !== "project") updatePageMetadata(pageName);
      document.querySelectorAll(".nav-pill-btn").forEach((btn) => {
        const isActive = btn.getAttribute("data-page") === activeNavKey;
        if (isActive) {
          btn.classList.add("active", "bg-[#111214]", "text-white", "font-semibold", "shadow-sm");
          btn.classList.remove("text-[#5A5C60]", "font-medium");
        } else {
          btn.classList.remove("active", "bg-[#111214]", "text-white", "font-semibold", "shadow-sm");
          btn.classList.add("text-[#5A5C60]", "font-medium");
        }
      });

      if (pageName === "project" && projectId !== null) {
        renderProjectPage(projectId);
        if (window.location.hash !== `#project/${projectId}`) {
          history.replaceState(null, "", `#project/${projectId}`);
        }
      } else {
        if (window.location.hash !== `#${pageName}`) {
          history.replaceState(null, "", `#${pageName}`);
        }
      }

      if (pageName === "resume") renderResumeContent();
      if (pageName === "partners") renderPartnersContent();
      if (pageName === "about") renderAboutContent();
      if (pageName === "admin") renderAdminDashboard();
      window.scrollTo(0, 0);
    }

    function openProjectPage(projectId) {
      switchPage("project", projectId);
    }

    function renderProjectPage(projectId) {
      const requestedIndex = portfolioProjects.findIndex((p) => p.id === Number(projectId));
      const projIndex = requestedIndex === -1 ? 0 : requestedIndex;
      const proj = portfolioProjects[projIndex];
      if (!proj) return;

      activeProjectId = proj.id;
      trackVisitorProjectInterest(proj);
      const isAr = currentLang === "ar";
      updatePageMetadata("project", proj);

      // Labels & Navigation Counter
      document.getElementById("backToWorkArrow").textContent = isAr ? "→" : "←";
      document.getElementById("backToWorkLabel").textContent = isAr ? "العودة لجميع الأعمال" : "Back to All Work";
      document.getElementById("projectCounterBadge").textContent = `${String(projIndex + 1).padStart(2, "0")} / ${String(portfolioProjects.length).padStart(2, "0")}`;

      // Quick Number Tabs (01 .. 09)
      const quickTabs = document.getElementById("projectQuickTabs");
      if (quickTabs) {
        quickTabs.innerHTML = portfolioProjects.map((p, index) => {
          const isCurrent = p.id === proj.id;
          return `
            <button type="button" onclick="openProjectPage(${p.id})" title="${isAr ? p.titleAr : p.titleEn}" class="w-7 h-7 rounded-full text-[11px] font-bold transition-all ${isCurrent ? 'bg-[#111214] text-white shadow-sm' : 'text-[#5A5C60] hover:bg-white/80 hover:text-[#111214]'}">
              ${String(index + 1).padStart(2, "0")}
            </button>
          `;
        }).join("");
      }

      // Hero Showcase & Metadata
      const coverBox = document.getElementById("modalProjectImage").parentElement;
      if (coverBox) {
        coverBox.className = `rounded-[24px] overflow-hidden bg-[#E5E6E8] ${proj.coverAspect || "aspect-[3/4]"} shadow-md border border-white/85 relative group`;
      }
      document.getElementById("modalProjectImage").src = proj.imageUrl;
      document.getElementById("modalProjectImage").alt = isAr ? proj.titleAr : proj.titleEn;
      document.getElementById("modalProjectLocationBadge").textContent = isAr ? (proj.locationAr || proj.location) : proj.location;
      document.getElementById("modalProjectCategory").textContent = isAr
        ? (proj.categoryAr || proj.categoryEn)
        : (proj.categoryEn || proj.categoryAr);
      document.getElementById("modalProjectYearPill").textContent = proj.year;
      document.getElementById("modalProjectSlugPill").textContent = `#project/${proj.id}`;
      document.getElementById("modalProjectTitle").textContent = isAr ? proj.titleAr : proj.titleEn;
      const projectSummary = isAr
        ? (proj.descriptionAr || proj.descriptionEn)
        : (proj.descriptionEn || proj.descriptionAr);
      document.getElementById("modalProjectDescription").textContent = projectSummary;
      const projectPdfs = getCmsProjectPdfFiles(proj);
      const projectPdfLink = document.getElementById("modalProjectPdfLink");
      const projectPdfUrl = projectPdfs[0]?.url || "";
      projectPdfLink.textContent = isAr ? "فتح ملف المشروع PDF ↗" : "Open project PDF ↗";
      projectPdfLink.classList.toggle("hidden", !projectPdfUrl);
      if (projectPdfUrl) projectPdfLink.href = projectPdfUrl;
      else projectPdfLink.removeAttribute("href");
      document.getElementById("metaClientLbl").textContent = isAr ? "العميل" : "Client";
      const client = isAr ? (proj.clientAr || proj.client || "") : (proj.client || proj.clientAr || "");
      document.getElementById("modalProjectClient").textContent = client;
      document.getElementById("projectClientMeta").classList.toggle("hidden", !client);
      document.getElementById("metaYearLbl").textContent = isAr ? "السنة والسوق" : "Year & Market";
      document.getElementById("modalProjectYear").textContent = [proj.year, isAr ? (proj.locationAr || proj.location) : proj.location].filter(Boolean).join(" • ");
      document.getElementById("metaRoleLbl").textContent = isAr ? "الدور" : "Role";
      document.getElementById("modalProjectRole").textContent = isAr ? (proj.roleAr || proj.roleEn || "") : (proj.roleEn || proj.roleAr || "");
      document.getElementById("projectRoleMeta").classList.toggle("hidden", !proj.roleEn && !proj.roleAr);
      document.getElementById("metaDeliverablesLbl").textContent = isAr ? "أبرز المخرجات" : "Key Deliverables";
      document.getElementById("modalProjectDeliverables").textContent = isAr
        ? (proj.deliverablesAr || proj.deliverablesEn || "")
        : (proj.deliverablesEn || proj.deliverablesAr || "");
      document.getElementById("metaToolsLbl").textContent = isAr ? "الأدوات وسير العمل" : "Tools & Pipeline";
      document.getElementById("modalProjectTools").innerHTML = (proj.tools || []).map((tool) => `
        <span class="rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold text-[#111214]">${escapeCmsHtml(tool)}</span>
      `).join("");
      document.getElementById("challengeHeading").textContent = isAr ? "التحدي ومتطلبات المشروع" : "Project Brief & Challenge";
      const challenge = isAr ? (proj.challengeAr || proj.challengeEn || "") : (proj.challengeEn || proj.challengeAr || "");
      document.getElementById("modalProjectChallenge").textContent = challenge;
      const hasDistinctChallenge = challenge && challenge !== projectSummary;
      document.getElementById("projectChallengeCard").classList.toggle("hidden", !hasDistinctChallenge);
      document.getElementById("solutionHeading").textContent = isAr ? "التوجه البصري والتنفيذ" : "Visual Direction & Execution";
      const solution = isAr ? (proj.solutionAr || proj.solutionEn || "") : (proj.solutionEn || proj.solutionAr || "");
      document.getElementById("modalProjectSolution").textContent = solution;
      document.getElementById("projectSolutionCard").classList.toggle("hidden", !solution);
      const outcomeCard = document.getElementById("projectOutcomeCard");
      const outcome = isAr
        ? (proj.outcomeAr || proj.outcomeEn || "")
        : (proj.outcomeEn || proj.outcomeAr || "");
      document.getElementById("outcomeHeading").textContent = isAr ? "النتيجة والأثر" : "Outcome & Impact";
      document.getElementById("modalProjectOutcome").textContent = outcome;
      outcomeCard.classList.toggle("hidden", !outcome);
      const projectPdfSection = document.getElementById("projectPdfSection");
      const projectPdfList = document.getElementById("projectPdfList");
      document.getElementById("projectPdfSubheading").textContent = isAr ? "ملفات المشروع" : "Project documents";
      document.getElementById("projectPdfHeading").textContent = isAr ? "ملفات PDF" : "PDF Documents";
      projectPdfSection.classList.toggle("hidden", projectPdfs.length === 0);
      projectPdfList.innerHTML = projectPdfs.map((pdf, index) => {
        const pdfUrl = escapeCmsHtml(pdf.url);
        const pdfName = escapeCmsHtml(pdf.name || `${isAr ? "ملف المشروع" : "Project PDF"} ${index + 1}`);
        const fileSize = Number(pdf.size) > 0
          ? `${(Number(pdf.size) / (1024 * 1024)).toFixed(1)} MB`
          : "";
        return `
          <article class="rounded-2xl border border-white/80 bg-white/55 p-4 shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="min-w-0">
                <h4 class="truncate text-sm font-bold text-[#111214]" title="${pdfName}">${pdfName}</h4>
                ${fileSize ? `<p class="mt-1 text-[10px] text-[#5A5C60]">${fileSize}</p>` : ""}
              </div>
              <div class="flex shrink-0 flex-wrap gap-2">
                <button type="button" data-pdf-preview="${index}" aria-expanded="false" class="rounded-full bg-[#111214] px-4 py-2 text-[11px] font-semibold text-white transition hover:opacity-90">${isAr ? "معاينة داخل الصفحة" : "Preview here"}</button>
                <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer" class="rounded-full bg-white/80 px-4 py-2 text-[11px] font-semibold text-[#111214] transition hover:bg-white">${isAr ? "فتح / تنزيل" : "Open / Download"} ↗</a>
              </div>
            </div>
            <div data-pdf-viewer="${index}" class="mt-4 hidden overflow-hidden rounded-xl border border-black/10 bg-white">
              <iframe title="${isAr ? "معاينة ملف PDF: " : "PDF preview: "}${pdfName}" data-pdf-src="${pdfUrl}#toolbar=1&navpanes=0&view=FitH" loading="lazy" class="h-[65vh] min-h-96 w-full" allow="fullscreen"></iframe>
            </div>
          </article>
        `;
      }).join("");
      projectPdfList.querySelectorAll("[data-pdf-preview]").forEach((button) => {
        button.addEventListener("click", () => {
          const index = button.dataset.pdfPreview;
          const viewer = projectPdfList.querySelector(`[data-pdf-viewer="${index}"]`);
          const iframe = viewer?.querySelector("iframe");
          const willOpen = viewer?.classList.contains("hidden");
          if (!viewer || !iframe) return;
          viewer.classList.toggle("hidden", !willOpen);
          button.setAttribute("aria-expanded", String(willOpen));
          button.textContent = willOpen
            ? (isAr ? "إخفاء المعاينة" : "Hide preview")
            : (isAr ? "معاينة داخل الصفحة" : "Preview here");
          if (willOpen && !iframe.src) iframe.src = iframe.dataset.pdfSrc;
        });
      });
      // Gallery Shots (Supports Multi-Size Editorial Grid Blocks & Captions)
      document.getElementById("gallerySubHeading").textContent = isAr ? "معرض الصور والتفاصيل متعدد المقاسات" : "Multi-Size Visual Showcase & Details";
      document.getElementById("galleryHeading").textContent = isAr ? "لقطات ومخرجات المشروع" : "Project Visual Frames";
      document.getElementById("inquireProjectBtnLbl").textContent = isAr ? "اطلب مشروعاً مشابهاً" : "Request Similar Project";
      const galleryContainer = document.getElementById("modalProjectGallery");

      const activeBlocks = (Array.isArray(proj.mediaBlocks) && proj.mediaBlocks.length > 0)
        ? proj.mediaBlocks
        : (Array.isArray(proj.gallery) && proj.gallery.length > 0 ? proj.gallery : [proj.imageUrl]).map((imgSrc) => ({
            url: imgSrc,
            aspect: "aspect-auto",
            captionEn: "",
            captionAr: ""
          }));

      const visibleBlocks = activeBlocks.filter((block) => typeof block?.url === "string" && block.url);
      if (proj.freeformGallery === true) {
        const galleryRows = Math.max(12, ...visibleBlocks.map((block, index) => {
          const layout = normalizeCmsMediaLayout(block, index);
          return Math.ceil(layout.y + layout.height);
        }));
        galleryContainer.className = "project-media-canvas";
        galleryContainer.style.setProperty("--project-gallery-rows", String(galleryRows));
        galleryContainer.style.aspectRatio = `12 / ${galleryRows}`;
        galleryContainer.innerHTML = visibleBlocks.map((block, index) => {
          const caption = isAr ? (block.captionAr || block.captionEn) : (block.captionEn || block.captionAr);
          const layout = normalizeCmsMediaLayout(block, index);
          return `
            <figure class="project-media-item group" data-gallery-image-index="${index}" style="left:${(layout.x / 12) * 100}%;top:${(layout.y / galleryRows) * 100}%;width:${(layout.width / 12) * 100}%;height:${(layout.height / galleryRows) * 100}%;z-index:${index + 1}" role="button" tabindex="0" aria-label="${isAr ? "عرض الصورة بالحجم الكامل" : "View image at full size"} ${index + 1}">
              <img src="${escapeCmsHtml(block.url)}" alt="${escapeCmsHtml(isAr ? proj.titleAr : proj.titleEn)} - ${index + 1}" loading="${index === 0 ? "eager" : "lazy"}" decoding="async" style="object-fit:${layout.fit}" />
              ${caption ? `<figcaption><span>0${index + 1}.</span>${escapeCmsHtml(caption)}</figcaption>` : ""}
            </figure>
          `;
        }).join("");
      } else {
        galleryContainer.className = "grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3";
        galleryContainer.removeAttribute("style");
        galleryContainer.innerHTML = visibleBlocks.map((block, index) => {
          const caption = isAr ? (block.captionAr || block.captionEn) : (block.captionEn || block.captionAr);
          const aspect = normalizeCmsMediaAspect(block.aspect);
          const imageClass = aspect === "aspect-auto" ? "w-full h-auto object-contain" : "w-full h-full object-cover";
          return `
            <figure class="min-w-0 flex flex-col overflow-hidden rounded-2xl bg-white/55 border border-white/85 shadow-sm group cursor-pointer" data-gallery-image-index="${index}" role="button" tabindex="0" aria-label="${isAr ? "عرض الصورة بالحجم الكامل" : "View image at full size"} ${index + 1}">
              <div class="overflow-hidden bg-[#E5E6E8] ${aspect} w-full">
                <img src="${escapeCmsHtml(block.url)}" alt="${escapeCmsHtml(isAr ? proj.titleAr : proj.titleEn)} - ${index + 1}" loading="${index === 0 ? "eager" : "lazy"}" decoding="async" class="${imageClass} transition-transform duration-500 group-hover:scale-[1.03]" />
              </div>
              ${caption ? `<figcaption class="border-t border-white/80 bg-white/75 px-4 py-3 text-xs font-medium leading-relaxed text-[#2A2C30] backdrop-blur-md"><span class="me-1.5 inline-block font-bold text-[#111214]">0${index + 1}.</span>${escapeCmsHtml(caption)}</figcaption>` : ""}
            </figure>
          `;
        }).join("");
      }
      galleryContainer.querySelectorAll("[data-gallery-image-index]").forEach((figure) => {
        const showFullImage = () => {
          const block = visibleBlocks[Number(figure.dataset.galleryImageIndex)];
          if (block) document.getElementById("modalProjectImage").src = block.url;
        };
        figure.addEventListener("click", showFullImage);
        figure.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            showFullImage();
          }
        });
      });

      // Similar / Related Projects Suggestions (3 smart-matched projects + Cookie Interest Boost)
      const dominant = getDominantInterest();
      document.getElementById("relatedProjectsSub").textContent = dominant
        ? (isAr ? `مقترح بناءً على اهتمامك بـ ${getInterestDisplayName(dominant, true)}` : `Tailored to Your ${getInterestDisplayName(dominant, false)} Interest`)
        : (isAr ? "اكتشف المزيد" : "Explore More");
      document.getElementById("relatedProjectsHeading").textContent = isAr ? "مشاريع مقاربة وذات صلة" : "Similar & Related Projects";
      document.getElementById("viewAllWorksBtnLbl").textContent = isAr ? "عرض كل المشاريع" : "View All Projects";

      const currentKeywords = `${proj.categoryEn} ${proj.location}`.toLowerCase().split(/[\s&,]+/);
      const relatedList = portfolioProjects
        .filter((p) => p.id !== proj.id)
        .map((candidate) => {
          const candText = `${candidate.categoryEn} ${candidate.location}`.toLowerCase();
          let score = getProjectMatchScore(candidate);
          currentKeywords.forEach((kw) => {
            if (kw.length > 2 && candText.includes(kw)) score += 2;
          });
          return { item: candidate, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((entry) => entry.item);

      const relatedGrid = document.getElementById("relatedProjectsGrid");
      if (relatedGrid) {
        relatedGrid.innerHTML = relatedList.map((rel) => {
          const relTitle = isAr ? rel.titleAr : rel.titleEn;
          const relCat = isAr ? rel.categoryAr : rel.categoryEn;
          const relLoc = isAr ? (rel.locationAr || rel.location) : rel.location;
          return `
            <article onclick="openProjectPage(${rel.id})" role="button" tabindex="0" class="ios-subcard rounded-2xl p-3.5 cursor-pointer group flex flex-col justify-between">
              <div>
                <div class="rounded-xl overflow-hidden bg-[#E5E6E8] aspect-[16/10] mb-3.5 relative border border-white/75">
                  <img src="${rel.imageUrl}" alt="${relTitle}" loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span class="glass-pill absolute top-2.5 start-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#111214]">0${rel.id}</span>
                </div>
                <span class="inline-block text-[10px] font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">${relCat}</span>
                <h4 class="text-sm sm:text-base font-bold text-[#111214] group-hover:opacity-80 transition-opacity line-clamp-1">${relTitle}</h4>
              </div>
              <div class="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between text-[11px] font-medium text-[#5A5C60]">
                <span>${relLoc} • ${rel.year}</span>
                <span class="font-bold text-[#111214] group-hover:translate-x-0.5 transition-transform">${isAr ? "عرض ←" : "View →"}</span>
              </div>
            </article>
          `;
        }).join("");
      }
    }

    function navigateProjectModal(step) {
      const idx = portfolioProjects.findIndex((p) => p.id === activeProjectId);
      if (idx === -1) return;
      const nextIdx = (idx + step + portfolioProjects.length) % portfolioProjects.length;
      openProjectPage(portfolioProjects[nextIdx].id);
    }

    function closeProjectPage() {
      switchPage("home");
    }

    function openContactModal() {
      const modal = document.getElementById("contactModal");
      if (!modal) return;
      modal.classList.remove("hidden");
      requestAnimationFrame(() => modal.classList.remove("opacity-0"));
    }

    function closeContactModal() {
      const modal = document.getElementById("contactModal");
      if (!modal) return;
      modal.classList.add("opacity-0");
      setTimeout(() => modal.classList.add("hidden"), 250);
    }

    function applyLanguageUI() {
      const isAr = currentLang === "ar";
      document.documentElement.lang = isAr ? "ar" : "en";
      document.documentElement.dir = isAr ? "rtl" : "ltr";
      const projectView = document.getElementById("projectPageView");
      if (projectView && !projectView.classList.contains("hidden")) {
        const project = portfolioProjects.find((item) => item.id === activeProjectId);
        updatePageMetadata("project", project);
      } else {
        const currentPage = Object.entries({
          home: "homePortfolioView",
          resume: "resumeView",
          partners: "partnersView",
          about: "aboutView"
        }).find(([, elementId]) => !document.getElementById(elementId)?.classList.contains("hidden"))?.[0] || "home";
        updatePageMetadata(currentPage);
      }

      const langBtn = document.getElementById("langToggleBtn");
      if (langBtn) langBtn.textContent = isAr ? "EN" : "AR";

      const heroTitle = document.getElementById("heroEditorialTitle");
      const heroSub = document.getElementById("heroEditorialSubtitle");
      const contactLabel = document.getElementById("contactBtnLabel");
      const pdfLabel = document.getElementById("pdfBtnLabel");

      if (heroTitle) {
        const rawHeroTitle = isAr ? cmsConfig.heroTitleAr : cmsConfig.heroTitleEn;
        heroTitle.innerHTML = rawHeroTitle.replace(/\n/g, "<br />");
      }
      if (heroSub) {
        heroSub.textContent = isAr ? cmsConfig.heroSubAr : cmsConfig.heroSubEn;
      }
      if (contactLabel) contactLabel.textContent = isAr ? "تواصل الآن" : "Contact Now";
      if (pdfLabel) pdfLabel.textContent = isAr ? "تحميل البورتفوليو PDF" : "Download PDF";
      updateCmsCoverPreviewCard();

      const navLabels = {
        home: isAr ? "الأعمال" : "All Work",
        resume: isAr ? "السيرة الذاتية" : "Resume",
        partners: isAr ? "الشركاء" : "Partners",
        about: isAr ? "من أنا" : "About me"
      };
      document.querySelectorAll(".nav-pill-btn").forEach((btn) => {
        const key = btn.getAttribute("data-page");
        if (navLabels[key]) btn.textContent = navLabels[key];
      });

      buildCarouselCards();
      updateCookieUI();
      renderResumeContent();
      renderPartnersContent();
      renderAboutContent();
      const activeProjectView = document.getElementById("projectPageView");
      if (activeProjectView && !activeProjectView.classList.contains("hidden")) {
        renderProjectPage(activeProjectId);
      }
    }

    // ==================== PDF EXPORT ====================
    function exportPortfolioPDF() {
      if (!window.jspdf) {
        openContactModal();
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 16;
      const contentW = pageW - margin * 2;
      let y = 0;

      const drawHeaderBanner = () => {
        doc.setFillColor(17, 18, 20);
        doc.rect(0, 0, pageW, 44, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text("MOSTAFA KHALED", margin, 17);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(215, 217, 220);
        doc.text("Senior 2D & 3D Graphic Designer | Brand Identity, 3D Product & CGI", margin, 24);

        // Interactive Clickable Hyperlinks in Header
        doc.setFontSize(8.5);
        doc.setTextColor(147, 197, 253);
        const emailLabel = "Email: Mkalwayzy@gmail.com";
        doc.textWithLink(emailLabel, margin, 34, { url: "mailto:Mkalwayzy@gmail.com" });

        const waLabel = "WhatsApp: +20 100 277 9252";
        doc.textWithLink(waLabel, margin + 56, 34, { url: "https://wa.me/201002779252" });

        const beLabel = "Behance: behance.net/Mkelwayzy";
        doc.textWithLink(beLabel, margin + 114, 34, { url: "https://www.behance.net/Mkelwayzy" });

        y = 54;
      };

      const ensureSpace = (neededHeight) => {
        if (y + neededHeight > pageH - 16) {
          doc.addPage();
          y = 18;
        }
      };

      const drawSectionTitle = (title) => {
        ensureSpace(14);
        doc.setFillColor(235, 236, 238);
        doc.roundedRect(margin, y - 5, contentW, 8.5, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(17, 18, 20);
        doc.text(title.toUpperCase(), margin + 3, y + 0.8);
        y += 9;
      };

      // ==================== PAGE 1: EXECUTIVE CV ====================
      drawHeaderBanner();

      // Executive Summary
      drawSectionTitle("Executive Summary & Core Focus");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.2);
      doc.setTextColor(60, 62, 66);
      const summaryLines = doc.splitTextToSize(
        "Senior 2D & 3D Graphic Designer with 6+ years of extensive creative leadership across the Saudi Arabian and Egyptian markets. Specializing in strategic Brand Identity Systems, 3D Product Modeling, Photorealistic CGI Outdoor Visuals, Packaging, and Motion Graphics.",
        contentW
      );
      doc.text(summaryLines, margin, y);
      y += summaryLines.length * 4.6 + 4;

      // Key Metrics Bar
      ensureSpace(16);
      const kpis = [
        { val: "+06 Years", lbl: "Market Experience" },
        { val: "+180 Projects", lbl: "2D, 3D & CGI Delivered" },
        { val: "+09 Agencies", lbl: "KSA & Egypt Roles" },
        { val: "95% Craft", lbl: "Visual Precision" }
      ];
      const boxW = (contentW - 9) / 4;
      kpis.forEach((k, idx) => {
        const bx = margin + idx * (boxW + 3);
        doc.setDrawColor(215, 217, 220);
        doc.roundedRect(bx, y, boxW, 13, 2, 2, "S");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(17, 18, 20);
        doc.text(k.val, bx + 3, y + 5.5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(95, 98, 102);
        doc.text(k.lbl, bx + 3, y + 10.5);
      });
      y += 20;

      // Professional Experience (All 9 Roles from Website)
      drawSectionTitle("Professional Experience (Saudi Arabia & Egypt)");
      experienceData.forEach((exp) => {
        const descLines = doc.splitTextToSize(exp.summaryEn, contentW - 4);
        const blockH = 11 + descLines.length * 4.1;
        ensureSpace(blockH);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(17, 18, 20);
        doc.text(`${exp.roleEn} — ${exp.company}`, margin, y);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(80, 82, 86);
        const rightTag = `${exp.locationEn} | ${exp.period}`;
        doc.text(rightTag, pageW - margin - doc.getTextWidth(rightTag), y);

        y += 4.5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(65, 68, 72);
        doc.text(descLines, margin + 2, y);
        y += descLines.length * 4.1 + 3.5;
      });

      // Education & Core Expertise
      drawSectionTitle("Education & Core Expertise");
      ensureSpace(22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(17, 18, 20);
      doc.text(`${educationData.degreeEn} — ${educationData.universityEn} (${educationData.period})`, margin, y);
      y += 5.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 62, 66);
      const expertiseText = "Core Expertise: " + expertiseTags.map((t) => t.en).join("  •  ");
      const expTagLines = doc.splitTextToSize(expertiseText, contentW);
      doc.text(expTagLines, margin, y);
      y += expTagLines.length * 4.3 + 4;

      // Software Mastery with Visual Progress Bars
      drawSectionTitle("Software & Technical Mastery");
      softwareList.forEach((sw) => {
        ensureSpace(8);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(17, 18, 20);
        doc.text(`${sw.name} (${sw.roleEn})`, margin, y);

        const pctText = `${sw.level}%`;
        doc.text(pctText, pageW - margin - doc.getTextWidth(pctText), y);

        const barX = margin + 96;
        const barW = contentW - 110;
        doc.setFillColor(225, 227, 230);
        doc.roundedRect(barX, y - 3, barW, 2.8, 1, 1, "F");
        doc.setFillColor(17, 18, 20);
        doc.roundedRect(barX, y - 3, (barW * sw.level) / 100, 2.8, 1, 1, "F");
        y += 6.5;
      });

      // ==================== PORTFOLIO PROJECTS & CASE STUDIES ====================
      y += 3;
      drawSectionTitle("Selected Portfolio Works & Case Studies");
      portfolioProjects.forEach((proj, idx) => {
        const descLines = doc.splitTextToSize(proj.descriptionEn, contentW - 6);
        const delivLines = doc.splitTextToSize(`Deliverables: ${proj.deliverablesEn}`, contentW - 6);
        const cardH = 14 + descLines.length * 4 + delivLines.length * 3.8;
        ensureSpace(cardH + 3);

        doc.setDrawColor(210, 212, 215);
        doc.setFillColor(250, 250, 251);
        doc.roundedRect(margin, y - 4, contentW, cardH, 2.5, 2.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.8);
        doc.setTextColor(17, 18, 20);
        doc.text(`0${idx + 1}. ${proj.titleEn}`, margin + 3, y + 1);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(90, 92, 96);
        const meta = `${proj.categoryEn}  |  ${proj.client} (${proj.location}, ${proj.year})`;
        doc.text(meta, pageW - margin - 3 - doc.getTextWidth(meta), y + 1);

        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.4);
        doc.setTextColor(55, 58, 62);
        doc.text(descLines, margin + 3, y);
        y += descLines.length * 4;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(17, 18, 20);
        doc.text(delivLines, margin + 3, y);
        y += delivLines.length * 3.8 + 5;
      });

      // ==================== STRATEGIC PARTNERS ====================
      drawSectionTitle("Partners of Success (Saudi Arabia & Regional)");
      partnersData.forEach((partner) => {
        const pDesc = doc.splitTextToSize(`${partner.name} (${partner.sectorLabelEn} — ${partner.countryEn}): ${partner.descEn}`, contentW - 2);
        ensureSpace(pDesc.length * 4.1 + 3);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.4);
        doc.setTextColor(50, 52, 56);
        doc.text(pDesc, margin, y);
        y += pDesc.length * 4.1 + 2.5;
      });

      // ==================== CLICKABLE CONTACT & PORTFOLIO FOOTER ====================
      ensureSpace(22);
      y += 4;
      doc.setFillColor(17, 18, 20);
      doc.roundedRect(margin, y, contentW, 18, 3, 3, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text("Direct Links & Full Interactive Showcase:", margin + 4, y + 6.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(147, 197, 253);
      doc.textWithLink("Behance Portfolio (behance.net/Mkelwayzy)", margin + 4, y + 13, { url: "https://www.behance.net/Mkelwayzy" });
      doc.textWithLink("WhatsApp Direct (+20 100 277 9252)", margin + 78, y + 13, { url: "https://wa.me/201002779252" });
      doc.textWithLink("Email (Mkalwayzy@gmail.com)", margin + 134, y + 13, { url: "mailto:Mkalwayzy@gmail.com" });

      // Page Numbers Footer on All Pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(130, 132, 136);
        doc.text(`Mostafa Khaled — Executive CV & Portfolio 2026  |  Page ${p} of ${totalPages}`, margin, pageH - 7);
        doc.setTextColor(59, 130, 246);
        doc.textWithLink("behance.net/Mkelwayzy", pageW - margin - 34, pageH - 7, { url: "https://www.behance.net/Mkelwayzy" });
      }

      doc.save("Mostafa_Khaled_CV_&_Portfolio_2026.pdf");
    }

    // ==================== EVENT BINDINGS & ROUTING ====================
    document.addEventListener("DOMContentLoaded", async () => {
      await restoreAdminSession();
      await loadCmsState();
      populateCmsProjectYearOptions();
      applyCmsThemeAndContact();

      // Load saved visitor cookie preferences if present
      const savedCookie = getBrowserCookie(COOKIE_KEY);
      if (savedCookie) {
        visitorCookieState = { ...visitorCookieState, ...savedCookie };
        const bestIdx = portfolioProjects.findIndex((p) => getProjectMatchScore(p) > 0);
        if (bestIdx !== -1) {
          virtualIndex = bestIdx;
          targetIndex = bestIdx;
        }
      }

      buildCarouselCards();
      updateCookieUI();
      requestAnimationFrame(renderCarouselFrame);

      // Cookie Card Event Listeners
      document.querySelectorAll(".interest-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          selectVisitorInterest(chip.getAttribute("data-interest"));
        });
      });

      const acceptCookiesBtn = document.getElementById("acceptCookiesBtn");
      const minimizeCookieCardBtn = document.getElementById("minimizeCookieCardBtn");

      if (acceptCookiesBtn) {
        acceptCookiesBtn.addEventListener("click", acceptAllSmartCookies);
      }
      if (minimizeCookieCardBtn) {
        minimizeCookieCardBtn.addEventListener("click", () => {
          visitorCookieState.dismissed = true;
          setBrowserCookie(COOKIE_KEY, visitorCookieState);
          updateCookieUI();
        });
      }

      const stage = document.getElementById("carouselStage");
      if (stage) {
        stage.addEventListener("mouseenter", () => { isStageHovered = true; });
        stage.addEventListener("mouseleave", () => { isStageHovered = false; isDragging = false; });
        stage.addEventListener("mousedown", (e) => {
          isDragging = true;
          dragMoved = false;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
          dragStartTarget = targetIndex;
          const hitId = detectCardAtPoint(e.clientX, e.clientY);
          if (hitId !== null) pointerDownCardId = hitId;
        });
        window.addEventListener("mousemove", (e) => {
          if (!isDragging) return;
          const dx = e.clientX - dragStartX;
          const dy = e.clientY - dragStartY;
          if (Math.hypot(dx, dy) > 14) dragMoved = true;
          if (dragMoved) {
            targetIndex = dragStartTarget - dx * 0.0045;
          }
        });
        window.addEventListener("mouseup", (e) => {
          if (isDragging && !dragMoved) {
            const clickedId = pointerDownCardId !== null ? pointerDownCardId : detectCardAtPoint(e.clientX, e.clientY);
            pointerDownCardId = null;
            isDragging = false;
            if (clickedId !== null) {
              openProjectPage(clickedId);
              return;
            }
          }
          pointerDownCardId = null;
          isDragging = false;
          setTimeout(() => { dragMoved = false; }, 50);
        });
        stage.addEventListener("touchstart", (e) => {
          if (!e.touches[0]) return;
          isDragging = true;
          dragMoved = false;
          dragStartX = e.touches[0].clientX;
          dragStartY = e.touches[0].clientY;
          dragStartTarget = targetIndex;
          const hitId = detectCardAtPoint(e.touches[0].clientX, e.touches[0].clientY);
          if (hitId !== null) pointerDownCardId = hitId;
        }, { passive: true });
        stage.addEventListener("touchmove", (e) => {
          if (!isDragging || !e.touches[0]) return;
          const dx = e.touches[0].clientX - dragStartX;
          const dy = e.touches[0].clientY - dragStartY;
          if (Math.hypot(dx, dy) > 14) dragMoved = true;
          if (dragMoved) {
            targetIndex = dragStartTarget - dx * 0.0055;
          }
        }, { passive: true });
        stage.addEventListener("touchend", (e) => {
          if (isDragging && !dragMoved) {
            const touch = e.changedTouches && e.changedTouches[0];
            const tappedId = pointerDownCardId !== null
              ? pointerDownCardId
              : (touch ? detectCardAtPoint(touch.clientX, touch.clientY) : null);
            pointerDownCardId = null;
            isDragging = false;
            if (tappedId !== null) {
              openProjectPage(tappedId);
              return;
            }
          }
          pointerDownCardId = null;
          isDragging = false;
          setTimeout(() => { dragMoved = false; }, 50);
        });
      }

      document.querySelectorAll(".nav-pill-btn").forEach((btn) => {
        btn.addEventListener("click", () => switchPage(btn.getAttribute("data-page")));
      });

      const headerLogo = document.getElementById("headerLogoLink");
      if (headerLogo) {
        headerLogo.addEventListener("click", (e) => {
          e.preventDefault();
          switchPage("home");
        });
      }

      const langToggle = document.getElementById("langToggleBtn");
      if (langToggle) {
        langToggle.addEventListener("click", () => {
          currentLang = currentLang === "en" ? "ar" : "en";
          applyLanguageUI();
        });
      }

      const contactBtn = document.getElementById("contactNowBtn");
      const headerAccountBtn = document.getElementById("headerAccountBtn");
      const closeContactBtn = document.getElementById("closeContactModalBtn");
      const closeProjectBtn = document.getElementById("closeProjectPageBtn");
      const pdfBtn = document.getElementById("downloadPdfBtn");

      if (contactBtn) contactBtn.addEventListener("click", openContactModal);
      if (headerAccountBtn) {
        headerAccountBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openAdminLoginModal();
        });
      }
      if (closeContactBtn) closeContactBtn.addEventListener("click", closeContactModal);
      if (closeProjectBtn) closeProjectBtn.addEventListener("click", closeProjectPage);
      if (pdfBtn) pdfBtn.addEventListener("click", exportPortfolioPDF);

      // ==================== ADMIN LOGIN & CMS EVENT WIRING ====================
      const closeAdminLoginBtn = document.getElementById("closeAdminLoginBtn");
      if (closeAdminLoginBtn) closeAdminLoginBtn.addEventListener("click", closeAdminLoginModal);

      const adminLoginForm = document.getElementById("adminLoginForm");
      if (adminLoginForm) {
        adminLoginForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const email = document.getElementById("adminLoginEmail").value.trim();
          const password = document.getElementById("adminLoginPassword").value;
          const errEl = document.getElementById("adminLoginError");
          if (!supabaseClient) {
            if (errEl) {
              errEl.textContent = "Supabase is unavailable. Check the project configuration and reload.";
              errEl.classList.remove("hidden");
            }
            return;
          }
          let data;
          let error;
          try {
            ({ data, error } = await supabaseClient.auth.signInWithPassword({ email, password }));
          } catch (signInError) {
            console.error("Unable to reach Supabase Auth.", signInError);
            if (errEl) {
              errEl.textContent = "Unable to reach the sign-in service. Check your connection and try again.";
              errEl.classList.remove("hidden");
            }
            return;
          }
          if (error) {
            console.error("Supabase rejected the administrator sign-in.", error);
            if (errEl) {
              errEl.textContent = `Sign-in failed: ${error.message || "Check your email and password."}`;
              errEl.classList.remove("hidden");
            }
            return;
          }
          try {
            if (!await isSupabaseAdmin(data.user.id)) {
              const { error: signOutError } = await supabaseClient.auth.signOut();
              if (signOutError) console.error("Unable to clear a non-admin Supabase session.", signOutError);
              if (errEl) {
                errEl.textContent = "This account is not authorized to manage the portfolio.";
                errEl.classList.remove("hidden");
              }
              return;
            }
            isAdminAuthenticated = true;
            if (errEl) errEl.classList.add("hidden");
            const remoteContentLoaded = await loadCmsState();
            if (remoteContentLoaded && !cmsRemoteStateExists && await saveCmsState()) {
              showCmsToast("Your current portfolio content was published to Supabase.");
            }
            applyCmsThemeAndContact();
            closeAdminLoginModal();
            adminLoginForm.reset();
            switchPage("admin");
          } catch (verificationError) {
            console.error("Unable to verify Supabase administrator access.", verificationError);
            try {
              const { error: signOutError } = await supabaseClient.auth.signOut();
              if (signOutError) console.error("Unable to clear an unverified Supabase session.", signOutError);
            } catch (signOutError) {
              console.error("Unable to clear an unverified Supabase session.", signOutError);
            }
            if (errEl) {
              errEl.textContent = verificationError?.code === "PGRST205"
                ? "Supabase tables are missing. Run supabase/setup.sql in this project's SQL Editor, then add your account to portfolio_admins."
                : `Admin access could not be verified: ${verificationError?.message || "Check the Supabase database setup."}`;
              errEl.classList.remove("hidden");
            }
          }
        });
      }

      const cmsProjectSearch = document.getElementById("cmsProjectSearch");
      if (cmsProjectSearch) cmsProjectSearch.addEventListener("input", filterCmsProjectList);

      // CMS Tabs Switching
      document.querySelectorAll(".cms-tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const targetTab = btn.getAttribute("data-cms-tab");
          document.querySelectorAll(".cms-tab-btn").forEach((b) => {
            b.classList.remove("active", "bg-obsidian", "text-white", "font-bold");
            b.classList.add("text-slateText", "font-semibold");
            b.setAttribute("aria-pressed", "false");
          });
          btn.classList.add("active", "bg-obsidian", "text-white", "font-bold");
          btn.classList.remove("text-slateText", "font-semibold");
          btn.setAttribute("aria-pressed", "true");

          document.querySelectorAll(".cms-tab-panel").forEach((panel) => panel.classList.add("hidden"));
          const activePanel = document.getElementById(`cmsTab${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}`);
          if (activePanel) activePanel.classList.remove("hidden");
        });
      });

      // Project Image File Upload to Data URL
      const projImgFile = document.getElementById("cmsProjImgFile");
      if (projImgFile) {
        projImgFile.addEventListener("change", async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const readVersion = ++cmsCoverReadVersion;
          if (!validateCmsImageFile(file)) {
            cmsCoverReadPending = false;
            document.getElementById("cmsProjCoverReadProgress").classList.add("hidden");
            e.target.value = "";
            return;
          }
          cmsCoverReadPending = true;
          updateCmsCoverReadProgress(0);
          try {
            const imageUrl = await readCmsFileAsDataUrl(file, (percent) => updateCmsCoverReadProgress(percent));
            if (readVersion !== cmsCoverReadVersion) return;
            setCmsProjectCoverImage(imageUrl);
            updateCmsCoverReadProgress(100, "Cover image ready.");
          } catch (error) {
            if (readVersion !== cmsCoverReadVersion) return;
            console.error("Unable to read the project cover image.", error);
            showCmsToast(error.message || "Unable to read the selected cover image.");
          } finally {
            if (readVersion === cmsCoverReadVersion) {
              cmsCoverReadPending = false;
              document.getElementById("cmsProjCoverReadProgress").classList.add("hidden");
              e.target.value = "";
            }
          }
        });
      }

      ["cmsProjTitleEn", "cmsProjTitleAr", "cmsProjDeliverables", "cmsProjCountry"].forEach((id) => {
        const field = document.getElementById(id);
        field?.addEventListener("input", updateCmsCoverPreviewCard);
        field?.addEventListener("change", updateCmsCoverPreviewCard);
      });
      document.getElementById("cmsProjCoverAspect")?.addEventListener("change", updateCmsCoverPreviewCard);
      updateCmsCoverPreviewCard();

      const projPdfFile = document.getElementById("cmsProjPdfFile");
      if (projPdfFile) {
        projPdfFile.addEventListener("change", (event) => {
          const files = Array.from(event.target.files || []);
          files.forEach((file) => {
            if (!validateCmsPdfFile(file)) return;
            cmsDraftPdfs.push({
              file,
              path: `${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}.pdf`,
              name: file.name,
              size: file.size
            });
          });
          renderCmsProjectPdfs();
          event.target.value = "";
        });
      }
      document.getElementById("cmsPublishProjectPdfsBtn")?.addEventListener("click", publishCmsProjectPdfs);

      // Read multiple selected images and show a large preview for each one.
      const batchImagesInput = document.getElementById("cmsBatchImagesInput");
      if (batchImagesInput) {
        batchImagesInput.addEventListener("change", (e) => {
          const files = Array.from(e.target.files || []);
          if (!files.length) return;
          files.forEach((file) => {
            if (!validateCmsImageFile(file)) return;
            const block = createDefaultMediaBlock();
            block.readProgress = 0;
            cmsDraftBlocks.push(block);
            renderCmsMediaBlocksEditor();
            readCmsFileAsDataUrl(file, (percent) => {
              block.readProgress = percent;
              updateCmsMediaBlockReadProgress(block.uid, percent);
            }).then((dataUrl) => {
              block.url = dataUrl;
              delete block.readProgress;
              cmsDraftGalleryChanged = true;
              renderCmsMediaBlocksEditor();
            }).catch((error) => {
              cmsDraftBlocks = cmsDraftBlocks.filter((item) => item.uid !== block.uid);
              renderCmsMediaBlocksEditor();
              console.error(`Unable to read project image "${file.name}".`, error);
              showCmsToast(`Unable to read "${file.name}": ${error.message || "image file error."}`);
            });
          });
          e.target.value = "";
        });
      }

      // Publish or Update Precision Project
      const cmsProjectForm = document.getElementById("cmsProjectForm");
      if (cmsProjectForm) {
        const aiDraftButton = document.getElementById("cmsProjectAiDraftBtn");
        const aiNarrativeInput = document.getElementById("cmsProjectNarrative");
        const aiConsentInput = document.getElementById("cmsProjectAiConsent");
        const aiStatus = document.getElementById("cmsProjectAiStatus");

        if (aiDraftButton && aiNarrativeInput && aiConsentInput && aiStatus) {
          aiDraftButton.addEventListener("click", async () => {
            const narrative = aiNarrativeInput.value.trim();
            if (!narrative) {
              aiStatus.textContent = "اكتب وصف المشروع أولًا.";
              return;
            }
            if (narrative.length > 5000) {
              aiStatus.textContent = "اختصر الوصف إلى 5000 حرف أو أقل.";
              return;
            }
            if (!aiConsentInput.checked) {
              aiStatus.textContent = "وافق على إرسال النص إلى Google قبل إنشاء المسودة.";
              return;
            }
            if (!supabaseClient || !isAdminAuthenticated) {
              aiStatus.textContent = "سجّل الدخول بحساب المشرف لاستخدام المساعد.";
              return;
            }

            const existingDraft = [
              "cmsProjTitleEn",
              "cmsProjTitleAr",
              "cmsProjCountry",
              "cmsProjCategoryEn",
              "cmsProjCategoryAr",
              "cmsProjSummaryEn",
              "cmsProjSummaryAr",
              "cmsProjDescEn",
              "cmsProjDescAr",
              "cmsProjDeliverables",
              "cmsProjDeliverablesAr"
            ].some((id) => document.getElementById(id).value.trim())
              || (document.getElementById("cmsProjYear").value && document.getElementById("cmsProjYear").value !== String(new Date().getFullYear()))
              || getSelectedCmsProjectTools().length > 0;
            if (existingDraft && !window.confirm("سيستبدل المساعد العنوان والملخص والتحدي والتصنيف والمخرجات والدولة والسنة والبرامج، ولن يغيّر بيانات العميل والدور والحل والنتيجة أو الصور وملفات PDF. هل تريد المتابعة؟")) {
              return;
            }

            aiDraftButton.disabled = true;
            aiDraftButton.textContent = "جارٍ ترتيب بيانات المشروع…";
            aiStatus.textContent = "جارٍ إرسال الوصف إلى Gemini لإنشاء مسودة…";
            try {
              const { data, error } = await supabaseClient.functions.invoke("draft-project", {
                body: { narrative }
              });
              if (error) {
                let errorCode = "";
                if (typeof error.context?.json === "function") {
                  try {
                    errorCode = (await error.context.json())?.error || "";
                  } catch (bodyError) {
                    console.warn("Unable to read the project assistant error response.", bodyError);
                  }
                }
                const errorMessages = {
                  AI_NOT_CONFIGURED: "لم يتم إعداد مفتاح Gemini في إعدادات Supabase بعد.",
                    FREE_QUOTA_EXCEEDED: "انتهت الحصة المجانية مؤقتًا. انتظر تجددها ثم حاول مرة أخرى؛ لن يغيّر التطبيق الموديل أو يعيد المحاولة تلقائيًا.",
                  NOT_ADMIN: "هذا الحساب غير مصرح له باستخدام مساعد المشاريع.",
                  UNAUTHORIZED: "انتهت جلسة المشرف. سجّل الدخول مرة أخرى.",
                  ADMIN_CHECK_FAILED: "تعذر التحقق من صلاحيات المشرف. راجع إعداد قاعدة البيانات ثم حاول مجددًا.",
                  INVALID_REQUEST: "الوصف غير صالح أو أطول من الحد المسموح.",
                  MODEL_NOT_AVAILABLE: "موديل Gemini المجاني غير متاح حاليًا لهذا الحساب.",
                  MODEL_REQUEST_FAILED: "تعذر على Gemini إنشاء المسودة. حاول مرة أخرى لاحقًا.",
                  INVALID_MODEL_OUTPUT: "لم يُرجع Gemini بيانات منظمة صالحة. حاول مرة أخرى."
                };
                throw new Error(errorMessages[errorCode] || error.message || "تعذر الاتصال بمساعد المشاريع.");
              }

              const draft = data?.project;
              const requiredTextFields = ["titleEn", "deliverables", "descriptionEn"];
              const optionalTextFields = ["titleAr", "descriptionAr"];
              if (!draft || requiredTextFields.some((field) => typeof draft[field] !== "string")) {
                throw new Error("استجابة المساعد غير مكتملة. حاول مرة أخرى.");
              }
              if (optionalTextFields.some((field) => field in draft && typeof draft[field] !== "string")) {
                throw new Error("استجابة المساعد غير مكتملة. حاول مرة أخرى.");
              }
              const validCountries = new Set(CMS_PROJECT_COUNTRIES.map((country) => country.value));
              if (draft.country !== "" && !validCountries.has(draft.country)) {
                throw new Error("أعاد المساعد دولة خارج الاختيارات المتاحة؛ لم يتم تغيير النموذج.");
              }
              const validYears = new Set(Array.from(document.getElementById("cmsProjYear").options, (option) => option.value));
              if (typeof draft.year !== "string" || (draft.year !== "" && !validYears.has(draft.year))) {
                throw new Error("أعاد المساعد سنة غير متاحة؛ لم يتم تغيير النموذج.");
              }
              const validTools = new Set(Array.from(document.querySelectorAll('input[name="cmsProjTools"]'), (checkbox) => checkbox.value));
              if (!Array.isArray(draft.tools) || draft.tools.some((tool) => !validTools.has(tool))) {
                throw new Error("أعاد المساعد برنامجًا خارج الاختيارات المتاحة؛ لم يتم تغيير النموذج.");
              }

              document.getElementById("cmsProjTitleEn").value = draft.titleEn;
              document.getElementById("cmsProjTitleAr").value = draft.titleAr || draft.titleEn;
              document.getElementById("cmsProjCountry").value = draft.country;
              document.getElementById("cmsProjYear").value = draft.year;
              document.getElementById("cmsProjSummaryEn").value = draft.descriptionEn;
              document.getElementById("cmsProjSummaryAr").value = draft.descriptionAr || draft.descriptionEn;
              document.getElementById("cmsProjDescEn").value = draft.descriptionEn;
              document.getElementById("cmsProjDescAr").value = draft.descriptionAr || draft.descriptionEn;
              document.getElementById("cmsProjDeliverables").value = draft.deliverables;
              document.getElementById("cmsProjDeliverablesAr").value = draft.deliverables;
              const primaryDeliverable = draft.deliverables.split(/[,،;]/, 1)[0].trim();
              document.getElementById("cmsProjCategoryEn").value = primaryDeliverable;
              document.getElementById("cmsProjCategoryAr").value = primaryDeliverable;
              setCmsProjectTools(draft.tools);
              updateCmsCoverPreviewCard();
              aiStatus.textContent = "تم ملء المسودة. راجع العنوان والوصف والدولة والسنة والبرامج قبل النشر.";
            } catch (error) {
              console.error("Unable to draft project fields with Gemini.", error);
              aiStatus.textContent = error.message || "حدث خطأ أثناء إنشاء المسودة.";
            } finally {
              aiConsentInput.checked = false;
              aiDraftButton.disabled = false;
              aiDraftButton.textContent = "رتّب بيانات المشروع بالذكاء الاصطناعي";
            }
          });
        }

        cmsProjectForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          setCmsProjectPublishStatus("");
          if (cmsCoverReadPending || cmsDraftBlocks.some((block) => !block.url)) {
            showCmsToast("Wait for all selected images to finish loading before publishing.");
            return;
          }
          const editId = document.getElementById("cmsEditProjectId").value;
          const toolsArr = getSelectedCmsProjectTools();
          const imgUrl = document.getElementById("cmsProjImgUrl").value.trim();
          const projectCountry = CMS_PROJECT_COUNTRIES.find((country) => country.value === document.getElementById("cmsProjCountry").value);
          if (!projectCountry) {
            showCmsToast("Choose a country from the available options.");
            return;
          }
          const editIndex = editId ? portfolioProjects.findIndex((project) => project.id === Number(editId)) : -1;
          if (editId && editIndex === -1) {
            showCmsToast("The selected project record no longer exists. Refresh the project list and try again.");
            return;
          }
          if (editId && portfolioProjects.some((project, index) => index !== editIndex && project.id === Number(editId))) {
            showCmsToast("This project ID is shared by multiple records. Reload the page to repair the duplicates first.");
            return;
          }
          if (!imgUrl) {
            showCmsToast("Select a cover image before publishing the project.");
            return;
          }
          const validMediaBlocks = cmsDraftBlocks
            .filter((b) => b.url && b.url.trim() !== "")
            .map((b, index) => {
              const { x, y, width, height, fit, ...legacyBlock } = b;
              return {
                ...(cmsDraftFreeformGallery ? b : legacyBlock),
                url: b.url.trim(),
                aspect: normalizeCmsMediaAspect(b.aspect),
                ...(cmsDraftFreeformGallery ? normalizeCmsMediaLayout(b, index) : {}),
                captionEn: b.captionEn || "",
                captionAr: b.captionAr || ""
              };
            });

          const preserveExistingGallery = Boolean(editId && !cmsDraftGalleryChanged);
          const existingProject = editId ? portfolioProjects[editIndex] : null;
          const galleryUrls = preserveExistingGallery
            ? existingProject.gallery
            : (validMediaBlocks.length > 0 ? validMediaBlocks.map((b) => b.url) : [imgUrl]);
          const mediaBlocks = preserveExistingGallery ? existingProject.mediaBlocks : validMediaBlocks;

          const submitButton = document.getElementById("cmsProjectSubmitBtn");
          const submitButtonLabel = submitButton.textContent;
          submitButton.disabled = true;
          submitButton.textContent = "Uploading project PDFs…";
          setCmsProjectPublishStatus("pending", "Publishing project and files…");
          cmsProjectPdfUploadActive = true;
          renderCmsProjectPdfs();
          const pendingPdfs = cmsDraftPdfs.filter((pdf) => pdf.file instanceof File);
          const totalPdfBytes = pendingPdfs.reduce((total, pdf) => total + pdf.file.size, 0);
          let completedPdfBytes = 0;
          const projectPdfFiles = [];
          try {
            for (const pdf of cmsDraftPdfs) {
              if (!(pdf.file instanceof File)) {
                if (pdf.url) projectPdfFiles.push({ name: pdf.name, url: pdf.url, size: Number(pdf.size) || 0 });
                continue;
              }
              const url = await uploadCmsPdfFile(pdf.file, pdf.path, (loaded, total) => {
                updateCmsProjectUploadProgress({
                  loaded: completedPdfBytes + loaded,
                  total: totalPdfBytes,
                  fileIndex: pendingPdfs.indexOf(pdf) + 1,
                  fileCount: pendingPdfs.length
                });
              });
              completedPdfBytes += pdf.file.size;
              const uploadedPdf = { name: pdf.name, url, size: pdf.file.size };
              projectPdfFiles.push(uploadedPdf);
              cmsDraftPdfs[cmsDraftPdfs.indexOf(pdf)] = { ...uploadedPdf, pending: true };
              renderCmsProjectPdfs();
            }
            if (pendingPdfs.length) {
              updateCmsProjectUploadProgress({
                loaded: totalPdfBytes,
                total: totalPdfBytes,
                fileIndex: pendingPdfs.length,
                fileCount: pendingPdfs.length,
                saving: true
              });
            }
          } catch (error) {
            console.error("Unable to upload project PDF files.", error);
            const errorMessage = getCmsErrorMessage(error, "Unable to upload project PDF files.");
            setCmsProjectPublishStatus("error", `Project was not published: ${errorMessage}`);
            showCmsToast(errorMessage);
            cmsProjectPdfUploadActive = false;
            renderCmsProjectPdfs();
            submitButton.disabled = false;
            submitButton.textContent = submitButtonLabel;
            resetCmsProjectUploadProgress();
            return;
          }

          const summaryEn = document.getElementById("cmsProjSummaryEn").value.trim();
          const summaryAr = document.getElementById("cmsProjSummaryAr").value.trim() || summaryEn;
          const challengeEn = document.getElementById("cmsProjDescEn").value.trim();
          const challengeAr = document.getElementById("cmsProjDescAr").value.trim() || challengeEn;
          const deliverables = document.getElementById("cmsProjDeliverables").value.trim();
          const deliverablesAr = document.getElementById("cmsProjDeliverablesAr").value.trim() || deliverables;
          const primaryDeliverable = deliverables.split(/[,،;]/, 1)[0].trim();
          const titleEn = document.getElementById("cmsProjTitleEn").value.trim();
          const titleAr = document.getElementById("cmsProjTitleAr").value.trim() || titleEn;
          const categoryEn = document.getElementById("cmsProjCategoryEn").value.trim() || primaryDeliverable || "Project";
          const categoryAr = document.getElementById("cmsProjCategoryAr").value.trim() || categoryEn || "مشروع";

          const projectPayload = {
            titleEn,
            titleAr,
            client: document.getElementById("cmsProjClientEn").value.trim(),
            clientAr: document.getElementById("cmsProjClientAr").value.trim(),
            categoryEn,
            categoryAr,
            year: document.getElementById("cmsProjYear").value.trim(),
            location: projectCountry.value,
            locationAr: projectCountry.arabic,
            roleEn: document.getElementById("cmsProjRoleEn").value.trim(),
            roleAr: document.getElementById("cmsProjRoleAr").value.trim(),
            tools: toolsArr,
            deliverablesEn: deliverables,
            deliverablesAr,
            descriptionEn: summaryEn,
            descriptionAr: summaryAr,
            challengeEn,
            challengeAr,
            solutionEn: document.getElementById("cmsProjSolutionEn").value.trim(),
            solutionAr: document.getElementById("cmsProjSolutionAr").value.trim(),
            outcomeEn: document.getElementById("cmsProjOutcomeEn").value.trim(),
            outcomeAr: document.getElementById("cmsProjOutcomeAr").value.trim(),
            pdfFiles: projectPdfFiles,
            pdfUrl: projectPdfFiles[0]?.url || "",
            imageUrl: imgUrl,
            coverAspect: document.getElementById("cmsProjCoverAspect").value || "aspect-[3/4]",
            mediaBlocks,
            gallery: galleryUrls,
            ...(cmsDraftFreeformGallery ? { freeformGallery: true } : {})
          };
          const successMessage = editId
            ? "Project and files updated."
            : "Project and files published.";
          const previousProjects = [...portfolioProjects];

          if (editId) {
            portfolioProjects[editIndex] = { ...portfolioProjects[editIndex], ...projectPayload };
          } else {
            const nextId = getNextProjectId();
            portfolioProjects.unshift({ id: nextId, ...projectPayload });
          }

          submitButton.textContent = "Publishing project…";
          let saved = false;
          try {
            saved = await saveCmsState(updateCmsProjectUploadProgress);
          } finally {
            submitButton.disabled = false;
            submitButton.textContent = submitButtonLabel;
            cmsProjectPdfUploadActive = false;
            renderCmsProjectPdfs();
            resetCmsProjectUploadProgress();
          }
          if (!saved) {
            portfolioProjects = previousProjects;
            setCmsProjectPublishStatus(
              "error",
              `Project was not published: ${lastCmsSaveError || "Unknown error. Check your connection and try again."}`
            );
            return;
          }
          resetCmsProjectForm();
          buildCarouselCards();
          renderAdminDashboard();
          setCmsProjectPublishStatus("success", editId ? "Project updated and published successfully." : "Project published successfully.");
          showCmsToast(successMessage);
        });
      }

      const cancelEditProjBtn = document.getElementById("cmsCancelEditProjectBtn");
      if (cancelEditProjBtn) cancelEditProjBtn.addEventListener("click", resetCmsProjectForm);

      // Save Platform Content Form
      const cmsContentForm = document.getElementById("cmsContentForm");
      if (cmsContentForm) {
        cmsContentForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          cmsConfig.studioTagEn = document.getElementById("cmsStudioTagEn").value;
          cmsConfig.studioTagAr = document.getElementById("cmsStudioTagAr").value;
          cmsConfig.heroTitleEn = document.getElementById("cmsHeroTitleEn").value;
          cmsConfig.heroTitleAr = document.getElementById("cmsHeroTitleAr").value;
          cmsConfig.heroSubEn = document.getElementById("cmsHeroSubEn").value;
          cmsConfig.heroSubAr = document.getElementById("cmsHeroSubAr").value;
          cmsConfig.aboutBioEn = document.getElementById("cmsAboutBioEn").value;
          cmsConfig.aboutBioAr = document.getElementById("cmsAboutBioAr").value;
          cmsConfig.aboutTitleEn = document.getElementById("cmsAboutTitleEn").value;
          cmsConfig.aboutTitleAr = document.getElementById("cmsAboutTitleAr").value;
          cmsConfig.aboutStatusEn = document.getElementById("cmsAboutStatusEn").value;
          cmsConfig.aboutStatusAr = document.getElementById("cmsAboutStatusAr").value;
          cmsConfig.resumeTitleEn = document.getElementById("cmsResumeTitleEn").value;
          cmsConfig.resumeTitleAr = document.getElementById("cmsResumeTitleAr").value;
          cmsConfig.resumeIntroEn = document.getElementById("cmsResumeIntroEn").value;
          cmsConfig.resumeIntroAr = document.getElementById("cmsResumeIntroAr").value;
          cmsConfig.partnersTitleEn = document.getElementById("cmsPartnersTitleEn").value;
          cmsConfig.partnersTitleAr = document.getElementById("cmsPartnersTitleAr").value;
          const saved = await saveCmsState();
          applyLanguageUI();
          if (saved) showCmsToast("Platform content & texts updated!");
        });
      }

      // Save Contact & Security Form
      const cmsContactForm = document.getElementById("cmsContactForm");
      if (cmsContactForm) {
        cmsContactForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          cmsConfig.waNumber = document.getElementById("cmsWaNumber").value.replace(/[^0-9]/g, "");
          cmsConfig.waDisplay = document.getElementById("cmsWaDisplay").value;
          cmsConfig.email = document.getElementById("cmsEmailAddr").value;
          cmsConfig.behanceUrl = document.getElementById("cmsBehanceUrl").value;
          cmsConfig.socialHandle = document.getElementById("cmsSocialHandle").value;
          const saved = await saveCmsState();
          applyCmsThemeAndContact();
          if (saved) showCmsToast("Contact & social details saved!");
        });
      }

      const cmsPasswordForm = document.getElementById("cmsPasswordForm");
      if (cmsPasswordForm) {
        cmsPasswordForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const newPassword = document.getElementById("cmsNewPassword").value;
          const confirmation = document.getElementById("cmsConfirmPassword").value;
          if (newPassword !== confirmation) {
            showCmsToast("The new password and confirmation do not match.");
            return;
          }
          if (!supabaseClient || !isAdminAuthenticated) {
            showCmsToast("Sign in as an authorized administrator before changing the password.");
            return;
          }
          let error;
          try {
            ({ error } = await supabaseClient.auth.updateUser({ password: newPassword }));
          } catch (passwordError) {
            console.error("Unable to reach Supabase Auth to update the password.", passwordError);
            showCmsToast("Password could not be updated. Check your connection and try again.");
            return;
          }
          if (error) {
            console.error("Unable to update the Supabase administrator password.", error);
            showCmsToast(`Password could not be updated: ${error.message}`);
            return;
          }
          cmsPasswordForm.reset();
          showCmsToast("Administrator password updated.");
        });
      }
      // Live Color Picker Hex Labels
      ["Primary", "Bg", "Muted"].forEach((key) => {
        const input = document.getElementById(`cmsColor${key}`);
        const hexLbl = document.getElementById(`cmsColor${key}Hex`);
        if (input && hexLbl) {
          input.addEventListener("input", () => {
            hexLbl.textContent = input.value.toUpperCase();
          });
        }
      });

      // Custom Logo Upload
      const customLogoFile = document.getElementById("cmsCustomLogoFile");
      if (customLogoFile) {
        customLogoFile.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async () => {
            cmsConfig.customLogoDataUrl = reader.result;
            applyCmsThemeAndContact();
            if (await saveCmsState()) showCmsToast("Custom logo uploaded!");
          };
          reader.readAsDataURL(file);
        });
      }

      const useSigLogoBtn = document.getElementById("cmsUseSignatureLogoBtn");
      if (useSigLogoBtn) {
        useSigLogoBtn.addEventListener("click", async () => {
          cmsConfig.customLogoDataUrl = "";
          applyCmsThemeAndContact();
          if (await saveCmsState()) showCmsToast("Restored signature calligraphy logo.");
        });
      }

      const cmsIdentityForm = document.getElementById("cmsIdentityForm");
      if (cmsIdentityForm) {
        cmsIdentityForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          cmsConfig.primaryColor = document.getElementById("cmsColorPrimary").value;
          cmsConfig.bgColor = document.getElementById("cmsColorBg").value;
          cmsConfig.mutedColor = document.getElementById("cmsColorMuted").value;
          cmsConfig.customLogoText = document.getElementById("cmsCustomLogoBrandText").value;
          applyCmsThemeAndContact();
          if (await saveCmsState()) showCmsToast("Brand identity & colors applied!");
        });
      }

      const cmsHomeBtn = document.getElementById("cmsHomeBtn");
      if (cmsHomeBtn) {
        cmsHomeBtn.addEventListener("click", () => {
          switchPage("home");
        });
      }

      const cmsLogoutBtn = document.getElementById("cmsLogoutBtn");
      if (cmsLogoutBtn) {
        cmsLogoutBtn.addEventListener("click", async () => {
          if (supabaseClient) {
            try {
              const { error } = await supabaseClient.auth.signOut();
              if (error) throw error;
            } catch (error) {
              console.error("Unable to sign out of Supabase.", error);
              showCmsToast(`Could not sign out: ${error.message || "Supabase request failed."}`);
              return;
            }
          }
          isAdminAuthenticated = false;
          applyCmsThemeAndContact();
          switchPage("home");
        });
      }

      const cmsResetDefaultsBtn = document.getElementById("cmsResetDefaultsBtn");
      if (cmsResetDefaultsBtn) {
        cmsResetDefaultsBtn.addEventListener("click", async () => {
          if (!window.confirm("Reset all portfolio content and settings to their defaults?")) return;
          cmsConfig = { ...defaultCmsConfig };
          restoreCmsContentDefaults();
          const saved = await saveCmsState();
          applyCmsThemeAndContact();
          applyLanguageUI();
          renderAdminDashboard();
          if (saved) showCmsToast("Platform defaults restored and published.");
        });
      }

      applyLanguageUI();

      // Support Direct URL Hash Routing (#project/1 .. #project/9, #resume, #partners, #about, #admin)
      const handleInitialRoute = () => {
        const hash = window.location.hash;
        if (hash.startsWith("#project/")) {
          const id = parseInt(hash.replace("#project/", ""), 10);
          if (!isNaN(id)) openProjectPage(id);
        } else if (hash === "#resume" || hash === "#partners" || hash === "#about" || hash === "#admin") {
          switchPage(hash.replace("#", ""));
        }
      };
      handleInitialRoute();
      window.addEventListener("hashchange", handleInitialRoute);
    });
