const goldPage = document.querySelector(".gold-page");

if (goldPage) {
  const fallbackData = {
    updatedAt: "2026-04-10T01:03:00+05:30",
    purity: {
      "24K": {
        perGram: 15753.5,
        tenGram: 147220.4
      },
      "22K": {
        perGram: 14428.7,
        tenGram: 134956.9
      },
      "18K": {
        perGram: 11041.53,
        tenGram: 110415.3
      }
    },
    periods: {
      "1W": {
        label: "1 Week Change",
        change: 1.75,
        startLabel: "4 Apr 26",
        endLabel: "10 Apr 26",
        series: [15480, 15430, 15380, 15310, 15340, 15410, 15470, 15540, 15640, 15710, 15753.5]
      },
      "1M": {
        label: "1 Month Change",
        change: 3.94,
        startLabel: "10 Mar 26",
        endLabel: "10 Apr 26",
        series: [15160, 15210, 15180, 15240, 15310, 15370, 15430, 15410, 15520, 15670, 15753.5]
      },
      "6M": {
        label: "6 Month Change",
        change: 11.38,
        startLabel: "10 Oct 25",
        endLabel: "10 Apr 26",
        series: [14140, 14220, 14350, 14410, 14560, 14790, 14950, 15120, 15410, 15620, 15753.5]
      },
      "1Y": {
        label: "1 Year Change",
        change: 23.67,
        startLabel: "10 Apr 25",
        endLabel: "10 Apr 26",
        series: [12740, 12890, 13080, 13220, 13440, 13710, 14020, 14530, 15040, 15410, 15753.5]
      },
      "3Y": {
        label: "3 Year Change",
        change: 41.12,
        startLabel: "10 Apr 23",
        endLabel: "10 Apr 26",
        series: [11120, 11580, 11890, 12110, 12430, 12920, 13440, 14110, 14820, 15320, 15753.5]
      },
      "5Y": {
        label: "5 Year Change",
        change: 58.44,
        startLabel: "10 Apr 21",
        endLabel: "10 Apr 26",
        series: [9940, 10220, 10870, 11320, 11980, 12620, 13140, 13920, 14710, 15240, 15753.5]
      }
    }
  };

  const purityFactors = {
    "24K": 1,
    "22K": 0.916,
    "18K": 0.701
  };

  const state = {
    data: fallbackData,
    purity: "24K",
    period: "1W"
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

  const resolveApiCandidates = () => {
    const pathname = window.location.pathname.replace(/\\/g, "/");
    const projectMatch = pathname.match(/\/([^/]+)\/[^/]*$/);
    const projectName = projectMatch ? projectMatch[1] : "Digirich-website";

    const candidates = [];
    const currentOriginApi = new URL("api/gold-price.php", window.location.href).toString();
    candidates.push(currentOriginApi);

    if (/^(127\.0\.0\.1|localhost)$/i.test(window.location.hostname)) {
      candidates.push(`http://localhost/${projectName}/api/gold-price.php`);
      candidates.push(`http://127.0.0.1/${projectName}/api/gold-price.php`);
    }

    return [...new Set(candidates)];
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
    refs.hero24k.textContent = formatCurrency(state.data.purity["24K"].tenGram);
    refs.hero22k.textContent = formatCurrency(state.data.purity["22K"].tenGram);
    refs.hero18k.textContent = formatCurrency(state.data.purity["18K"].tenGram);
    refs.spread24k.textContent = formatCurrency(state.data.purity["24K"].perGram);
    refs.spread22k.textContent = formatCurrency(state.data.purity["22K"].perGram);
    refs.spread18k.textContent = formatCurrency(state.data.purity["18K"].perGram);
  };

  const render = () => {
    const activePeriod = state.data.periods[state.period];
    const activePrice = state.data.purity[state.purity].perGram;
    const series = buildSeriesForPurity(state.period, state.purity);
    const { line, area, lastPoint } = buildPath(series);
    const changePrefix = activePeriod.change >= 0 ? "+" : "-";

    refs.dateStamp.textContent = formatTimestamp(state.data.updatedAt);
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

    for (const url of candidates) {
      try {
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        if (!response.ok) {
          continue;
        }

        const payload = await response.json();
        if (!payload || payload.ok === false || !payload.updatedAt || !payload.purity || !payload.periods) {
          continue;
        }

        state.data = payload;
        renderHeroPrices();
        render();
        return;
      } catch (error) {
        // Try the next candidate. The page retains fallback data until a live endpoint responds.
      }
    }
  };

  renderHeroPrices();
  render();
  fetchRemoteData();
}
