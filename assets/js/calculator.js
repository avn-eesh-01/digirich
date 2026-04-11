const calculatorPage = document.querySelector(".calculator-page");

if (calculatorPage) {
  const fallbackRates = {
    updatedAt: "2026-04-10T01:03:00+05:30",
    purity: {
      "24K": { perGram: 7452 },
      "22K": { perGram: 6827.03 },
      "18K": { perGram: 5224.45 },
      "14K": { perGram: 4068.23 }
    }
  };

  const state = {
    mode: "weight",
    purity: "24K",
    rates: fallbackRates
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

  const desktopHoverQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1025px)");

  const apiCandidates = () => {
    const candidates = ["api/gold-price.php"];
    const { origin, pathname, port, hostname } = window.location;
    const segments = pathname.split("/").filter(Boolean);
    const projectName = segments.length > 1 ? segments[0] : "Digirich-website";

    if (port === "5500" || port === "5501" || hostname === "127.0.0.1") {
      candidates.push(`http://localhost/${projectName}/api/gold-price.php`);
      candidates.push(`http://127.0.0.1/${projectName}/api/gold-price.php`);
      candidates.push("http://localhost/Digirich-website/api/gold-price.php");
      candidates.push("http://127.0.0.1/Digirich-website/api/gold-price.php");
    }

    if (origin.startsWith("http")) {
      candidates.push(`${origin}/api/gold-price.php`);
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

  const formatCompactCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      notation: "compact",
      maximumFractionDigits: 2
    }).format(value);

  const getRate = () => state.rates.purity[state.purity]?.perGram || 0;

  const renderMetrics = () => {
    const gramRate = state.rates.purity["24K"]?.perGram || 0;
    refs.metricGram.textContent = formatCurrency(gramRate, 0);
    refs.metricTola.textContent = formatCurrency(gramRate * 11.66, 0);
    refs.metricKg.textContent = formatCompactCurrency(gramRate * 1000);
  };

  const render = () => {
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
    for (const endpoint of apiCandidates()) {
      try {
        const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
        if (!response.ok) {
          continue;
        }

        const payload = await response.json();
        if (!payload?.purity?.["24K"]?.perGram) {
          continue;
        }

        state.rates = {
          updatedAt: payload.updatedAt,
          purity: {
            "24K": { perGram: payload.purity["24K"].perGram },
            "22K": { perGram: payload.purity["22K"]?.perGram || payload.purity["24K"].perGram * 0.916 },
            "18K": { perGram: payload.purity["18K"]?.perGram || payload.purity["24K"].perGram * 0.701 },
            "14K": { perGram: payload.purity["24K"].perGram * 0.585 }
          }
        };

        renderMetrics();
        render();
        return;
      } catch (error) {
        // Try the next endpoint candidate.
      }
    }

    renderMetrics();
    render();
  };

  renderMetrics();
  render();
  fetchRemoteData();
}
