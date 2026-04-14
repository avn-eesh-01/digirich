const calculatorPage = document.querySelector(".calculator-page");

if (calculatorPage) {
  const purityFactor = {
    "24K": 1.0,
    "22K": 0.916,
    "18K": 0.701,
    "14K": 0.5833
  };

  const state = {
    mode: "weight",
    purity: "24K",
    rates: null,
    isFromCache: false,
    cacheKey: "digirich_gold_price_cache"
  };

  const refs = {
    tabs: document.querySelectorAll(".calculator-tabs button"),
    purityButtons: document.querySelectorAll(".calculator-purities button"),
    card: document.querySelector(".calculator-card"),
    input: document.getElementById("calculatorInput"),
    unit: document.getElementById("calculatorUnit"),
    liveRate: document.getElementById("calcLiveRate"),
    liveRateMeta: document.getElementById("calcLiveRateMeta"),
    baseLabel: document.getElementById("calcBaseLabel"),
    baseValue: document.getElementById("calcBaseValue"),
    makingLabel: document.getElementById("calcMakingLabel"),
    makingValue: document.getElementById("calcMakingValue"),
    gstLabel: document.getElementById("calcGstLabel"),
    gstValue: document.getElementById("calcGstValue"),
    totalMeta: document.getElementById("calcTotalMeta"),
    totalValue: document.getElementById("calcTotalValue"),
    metricGram: document.getElementById("metricGram"),
    metricTola: document.getElementById("metricTola"),
    metricKg: document.getElementById("metricKg")
  };

  // Storage helpers
  const StorageHelper = {
    save: (data) => {
      try {
        localStorage.setItem(state.cacheKey, JSON.stringify(data));
        console.log('Calculator data saved to localStorage');
      } catch (e) {
        console.warn('Failed to save calculator data to localStorage:', e);
      }
    },
    load: () => {
      try {
        const data = localStorage.getItem(state.cacheKey);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        console.warn('Failed to load calculator data from localStorage:', e);
        return null;
      }
    }
  };

  const desktopHoverQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1025px)");

  const apiCandidates = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    return [
      `${protocol}//${hostname}${port}/Digirich-website/api/gold-price.php`,
      `${protocol}//${hostname}${port}/api/gold-price.php`
    ];
  };

  const formatCurrency = (value, fractionDigits = 2) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits
    }).format(value);

  const formatCompactCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      notation: "compact",
      maximumFractionDigits: 2
    }).format(value);

  const getRate = () => state.rates?.purity?.[state.purity]?.perGram || 0;

  const renderMetrics = () => {
    if (!state.rates) return;
    const gramRate = state.rates.purity["24K"]?.perGram || 0;
    if (refs.metricGram) refs.metricGram.textContent = formatCurrency(gramRate, 0);
    if (refs.metricTola) refs.metricTola.textContent = formatCurrency(gramRate * 11.66, 0);
    if (refs.metricKg) refs.metricKg.textContent = formatCompactCurrency(gramRate * 1000);
  };

  const render = () => {
    if (!state.rates) {
      console.log('No rates data available for rendering');
      return;
    }
    
    const numericInput = Number.parseFloat(refs.input.value) || 0;
    const rate = getRate();
    const makingRate = 0.05;
    const gstRate = 0.03;
    const baseValue = state.mode === "weight" ? numericInput * rate : numericInput;
    const makingValue = baseValue * makingRate;
    const gstValue = (baseValue + makingValue) * gstRate;
    const total = baseValue + makingValue + gstValue;
    const convertedWeight = rate > 0 ? numericInput / rate : 0;

    refs.tabs.forEach((button) => {
      const isActive = button.dataset.mode === state.mode;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    refs.purityButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.purity === state.purity);
    });

    refs.unit.textContent = state.mode === "weight" ? "g" : "INR";
    refs.liveRate.textContent = formatCurrency(rate);
    refs.liveRateMeta.textContent = `${state.purity} per gram`;

    if (state.mode === "weight") {
      refs.baseLabel.textContent = `Gold Value (${numericInput || 0} g @ ${state.purity})`;
      refs.baseValue.textContent = formatCurrency(baseValue);
      refs.makingLabel.textContent = "Making Charges 5%";
      refs.makingValue.textContent = formatCurrency(makingValue);
      refs.gstLabel.textContent = "GST 3%";
      refs.gstValue.textContent = formatCurrency(gstValue);
      refs.totalMeta.textContent = "inclusive of charges";
      refs.totalValue.textContent = formatCurrency(total);
    } else {
      refs.baseLabel.textContent = `Estimated Weight @ ${state.purity}`;
      refs.baseValue.textContent = `${convertedWeight.toFixed(3)} g`;
      refs.makingLabel.textContent = "Reference Gold Value";
      refs.makingValue.textContent = formatCurrency(baseValue / (1 + makingRate + gstRate + makingRate * gstRate));
      refs.gstLabel.textContent = "Rate Used";
      refs.gstValue.textContent = formatCurrency(rate);
      refs.totalMeta.textContent = "approximate buy budget entered";
      refs.totalValue.textContent = formatCurrency(baseValue);
    }
  };

  refs.tabs.forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      refs.input.placeholder = state.mode === "weight" ? "Enter grams" : "Enter amount";
      refs.input.value = state.mode === "weight" ? "10" : "80000";
      render();
    });
  });

  refs.purityButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.purity = button.dataset.purity;
      render();
    });
  });

  refs.input.addEventListener("input", render);

  if (refs.card && desktopHoverQuery.matches) {
    refs.card.addEventListener("pointermove", (event) => {
      const rect = refs.card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;

      refs.card.style.transform = `perspective(1200px) rotateX(${(py * -5).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg) translateY(-4px)`;
    });

    refs.card.addEventListener("pointerleave", () => {
      refs.card.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0)";
    });
  }

  const fetchRemoteData = async () => {
    const endpoints = apiCandidates();
    console.log("Calculator: Attempting to fetch from endpoints:", endpoints);

    for (const endpoint of endpoints) {
      try {
        console.log("Calculator: Fetching from:", endpoint);
        const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
        
        if (!response.ok) {
          console.log("Calculator: Response not OK, trying next candidate");
          continue;
        }

        const payload = await response.json();
        console.log("Calculator: Payload received:", payload);
        
        if (!payload?.purity?.["24K"]?.perGram) {
          console.log("Calculator: Payload validation failed");
          continue;
        }

        state.rates = {
          updatedAt: payload.updatedAt,
          purity: {
            "24K": { perGram: payload.purity["24K"].perGram },
            "22K": { perGram: payload.purity["22K"]?.perGram || payload.purity["24K"].perGram * purityFactor["22K"] },
            "18K": { perGram: payload.purity["18K"]?.perGram || payload.purity["24K"].perGram * purityFactor["18K"] },
            "14K": { perGram: payload.purity["24K"].perGram * purityFactor["14K"] }
          }
        };
        
        state.isFromCache = false;
        StorageHelper.save(payload);
        console.log("Calculator: Successfully loaded API data!");
        renderMetrics();
        render();
        return;
      } catch (error) {
        console.log("Calculator: Fetch error:", error.message);
      }
    }
    
    console.log("Calculator: All API attempts failed, trying localStorage");
    const cachedData = StorageHelper.load();
    if (cachedData && cachedData.purity) {
      console.log("Calculator: Using cached data from localStorage");
      state.rates = {
        updatedAt: cachedData.updatedAt,
        purity: {
          "24K": { perGram: cachedData.purity["24K"]?.perGram || 0 },
          "22K": { perGram: cachedData.purity["22K"]?.perGram || 0 },
          "18K": { perGram: cachedData.purity["18K"]?.perGram || 0 },
          "14K": { perGram: cachedData.purity["24K"]?.perGram ? cachedData.purity["24K"].perGram * purityFactor["14K"] : 0 }
        }
      };
      state.isFromCache = true;
      renderMetrics();
      render();
      return;
    }
    
    console.log("Calculator: No data available - all API attempts failed and no cache found");
  };

  // Try to load cached data immediately for better UX
  const initialCache = StorageHelper.load();
  if (initialCache && initialCache.purity) {
    console.log("Calculator: Loading initial cache");
    state.rates = {
      updatedAt: initialCache.updatedAt,
      purity: {
        "24K": { perGram: initialCache.purity["24K"]?.perGram || 0 },
        "22K": { perGram: initialCache.purity["22K"]?.perGram || 0 },
        "18K": { perGram: initialCache.purity["18K"]?.perGram || 0 },
        "14K": { perGram: initialCache.purity["24K"]?.perGram ? initialCache.purity["24K"].perGram * purityFactor["14K"] : 0 }
      }
    };
    state.isFromCache = true;
    renderMetrics();
    render();
  }
  
  // Then fetch fresh data
  fetchRemoteData();
}
