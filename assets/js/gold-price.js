const goldPage = document.querySelector(".gold-page");

if (goldPage) {
  const purityFactors = {
    "24K": 1,
    "22K": 0.916,
    "18K": 0.701
  };

  // Initialize empty state
  const state = {
    data: null,
    purity: "24K",
    period: "1W",
    isFromCache: false,
    cacheKey: "digirich_gold_price_cache"
  };

  const refs = {
    dateStamp: document.getElementById("goldDateStamp"),
    hero24k: document.getElementById("hero24k"),
    hero22k: document.getElementById("hero22k"),
    hero18k: document.getElementById("hero18k"),
    puritySelect: document.getElementById("goldPuritySelect"),
    pricePerGram: document.getElementById("goldPricePerGram"),
    changeLabel: document.getElementById("goldChangeLabel"),
    changeValue: document.getElementById("goldChangeValue"),
    axisStart: document.getElementById("goldAxisStart"),
    axisEnd: document.getElementById("goldAxisEnd"),
    linePath: document.getElementById("goldLinePath"),
    areaPath: document.getElementById("goldAreaPath"),
    focusLine: document.getElementById("goldFocusLine"),
    focusDot: document.getElementById("goldFocusDot"),
    periodButtons: document.querySelectorAll("#goldPeriodButtons button"),
    spread24k: document.getElementById("spread24k"),
    spread22k: document.getElementById("spread22k"),
    spread18k: document.getElementById("spread18k")
  };

  // Storage helpers
  const StorageHelper = {
    save: (data) => {
      try {
        localStorage.setItem(state.cacheKey, JSON.stringify(data));
        console.log('Data saved to localStorage');
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
    },
    load: () => {
      try {
        const data = localStorage.getItem(state.cacheKey);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        console.warn('Failed to load from localStorage:', e);
        return null;
      }
    },
    clear: () => {
      try {
        localStorage.removeItem(state.cacheKey);
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
    }
  };

  const resolveApiCandidates = () => {
    // Build absolute URLs pointing to the project root API
    const candidates = [];
    
    // Try: /projectname/api/gold-price.php and /Digirich-website/api/gold-price.php
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    candidates.push(`${protocol}//${hostname}${port}/Digirich-website/api/gold-price.php`);
    candidates.push(`${protocol}//${hostname}${port}/api/gold-price.php`);
    
    return candidates;
  };

  const formatCurrency = (value, fractionDigits = 2) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits
    }).format(value);

  const formatNumber = (value) =>
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return "10 Apr 26, 01:03 am";
    }

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata"
    })
      .format(date)
      .replace(",", "")
      .toLowerCase();
  };

  const buildSeriesForPurity = (periodKey, purityKey) => {
    const baseSeries = state.data.periods[periodKey].series;
    const factor = purityFactors[purityKey] || 1;
    return baseSeries.map((point) => Number((point * factor).toFixed(2)));
  };

  const buildPath = (series) => {
    const width = 700;
    const height = 266;
    const left = 26;
    const top = 24;
    const bottom = 290;
    const max = Math.max(...series);
    const min = Math.min(...series);
    const range = Math.max(max - min, 1);
    const stepX = width / Math.max(series.length - 1, 1);

    const points = series.map((value, index) => {
      const x = left + stepX * index;
      const y = top + ((max - value) / range) * height;
      return { x, y };
    });

    const line = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");

    const lastPoint = points[points.length - 1];
    const area = `${line} L ${lastPoint.x.toFixed(2)} ${bottom} L ${points[0].x.toFixed(2)} ${bottom} Z`;

    return { line, area, lastPoint };
  };

  const renderHeroPrices = () => {
    if (!state.data) return;
    refs.hero24k.textContent = formatCurrency(state.data.purity["24K"].tenGram);
    refs.hero22k.textContent = formatCurrency(state.data.purity["22K"].tenGram);
    refs.hero18k.textContent = formatCurrency(state.data.purity["18K"].tenGram);
    refs.spread24k.textContent = formatCurrency(state.data.purity["24K"].perGram);
    refs.spread22k.textContent = formatCurrency(state.data.purity["22K"].perGram);
    refs.spread18k.textContent = formatCurrency(state.data.purity["18K"].perGram);
  };

  const render = () => {
    if (!state.data) {
      console.log('No data available to render');
      return;
    }
    
    const activePeriod = state.data.periods[state.period];
    const activePrice = state.data.purity[state.purity].perGram;
    const series = buildSeriesForPurity(state.period, state.purity);
    const { line, area, lastPoint } = buildPath(series);
    const changePrefix = activePeriod.change >= 0 ? "+" : "-";
    
    let dateText = formatTimestamp(state.data.updatedAt);
    if (state.isFromCache) {
      dateText = "Last updated: " + dateText;
    }

    refs.dateStamp.textContent = dateText;
    refs.pricePerGram.textContent = formatNumber(activePrice);
    refs.changeLabel.textContent = activePeriod.label;
    refs.changeValue.textContent = `${changePrefix} ${Math.abs(activePeriod.change).toFixed(2)}%`;
    refs.changeValue.style.color = activePeriod.change >= 0 ? "#1fa95a" : "#bf4a36";
    refs.axisStart.textContent = activePeriod.startLabel;
    refs.axisEnd.textContent = activePeriod.endLabel;
    refs.linePath.setAttribute("d", line);
    refs.areaPath.setAttribute("d", area);
    refs.focusLine.setAttribute("x1", lastPoint.x.toFixed(2));
    refs.focusLine.setAttribute("x2", lastPoint.x.toFixed(2));
    refs.focusDot.setAttribute("cx", lastPoint.x.toFixed(2));
    refs.focusDot.setAttribute("cy", lastPoint.y.toFixed(2));

    refs.periodButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.period === state.period);
    });

    refs.puritySelect.value = state.purity;
  };

  refs.periodButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.period = button.dataset.period;
      render();
    });
  });

  if (refs.puritySelect) {
    refs.puritySelect.addEventListener("change", (event) => {
      state.purity = event.target.value;
      render();
    });
  }

  const fetchRemoteData = async () => {
    const candidates = resolveApiCandidates();
    console.log("Attempting to fetch from candidates:", candidates);

    for (const url of candidates) {
      try {
        console.log("Fetching from:", url);
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        console.log("Response status:", response.status, response.ok);
        
        if (!response.ok) {
          console.log("Response not OK, trying next candidate");
          continue;
        }

        const payload = await response.json();
        console.log("Payload received:", payload);
        
        if (!payload || payload.ok === false || !payload.updatedAt || !payload.purity || !payload.periods) {
          console.log("Payload validation failed", {
            hasPayload: !!payload,
            ok: payload?.ok,
            updatedAt: payload?.updatedAt,
            purity: !!payload?.purity,
            periods: !!payload?.periods
          });
          continue;
        }

        console.log("Successfully loaded API data!");
        state.data = payload;
        state.isFromCache = false;
        StorageHelper.save(payload);
        renderHeroPrices();
        render();
        return;
      } catch (error) {
        console.log("Fetch error:", error.message);
      }
    }
    
    console.log("All API candidates failed, trying localStorage");
    const cachedData = StorageHelper.load();
    if (cachedData) {
      console.log("Using cached data from localStorage");
      state.data = cachedData;
      state.isFromCache = true;
      renderHeroPrices();
      render();
      return;
    }
    
    console.log("No data available - all API attempts failed and no cache found");
  };

  // Try to load cached data immediately for better UX
  const initialCache = StorageHelper.load();
  if (initialCache) {
    state.data = initialCache;
    state.isFromCache = true;
    renderHeroPrices();
    render();
  }
  
  // Then fetch fresh data
  fetchRemoteData();
}
