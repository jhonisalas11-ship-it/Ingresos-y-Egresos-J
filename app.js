/**
 * FinanzaPro - Sistema Dinámico de Gestión y Estadísticas de Ingresos y Egresos
 */

// ================= ESTADO GLOBAL Y CONFIGURACIÓN =================
const DEFAULT_CATEGORIES = {
  expense: [
    'Alimentación y Comidas',
    'Vivienda y Alquiler',
    'Servicios Públicos (Luz, Agua, Gas)',
    'Transporte y Gasolina',
    'Ocio y Entretenimiento',
    'Salud y Medicina',
    'Educación y Cursos',
    'Ropa y Accesorios',
    'Suscripciones Digitales',
    'Otros Gastos'
  ],
  income: [
    'Salario / Sueldo Principal',
    'Ventas / Negocio Propio',
    'Trabajo Freelance / Honorarios',
    'Rendimientos e Inversiones',
    'Bonificaciones y Aguinaldo',
    'Regalos y Premios',
    'Otros Ingresos'
  ]
};

// Paleta de colores atractiva para categorías
const CATEGORY_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#14b8a6', '#f43f5e', '#84cc16', '#06b6d4',
  '#d946ef', '#f97316', '#a855f7', '#64748b'
];

let appState = {
  transactions: [],
  categories: { ...DEFAULT_CATEGORIES },
  settings: {
    currency: '$',
    savingsTarget: 20,
    docTitle: 'Ingresos y Egresos Jhonatan Salas',
    userName: 'Jhonatan Salas'
  },
  currentPeriod: 'all', // 'all', 'this_month', 'last_month', 'this_year'
  chartComparisonType: 'bar', // 'bar' | 'line'
  tableFilter: {
    search: '',
    type: 'all'
  }
};

// Variables para instancias de Chart.js
let charts = {
  monthlyComparison: null,
  expenseCategory: null,
  incomeCategory: null,
  balanceTrend: null
};

// ================= INICIALIZACIÓN DE LA APLICACIÓN =================
document.addEventListener('DOMContentLoaded', () => {
  loadDataFromStorage();
  initTheme();
  setupEventListeners();
  populateCategorySelects();
  updateDocumentBranding();
  
  // Establecer fecha de hoy por defecto en el input
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('txDate');
  if (dateInput) dateInput.value = today;

  const currentYearSpan = document.getElementById('currentYear');
  if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

  renderAll();
});

// ================= GESTIÓN DE ALMACENAMIENTO (LOCALSTORAGE) =================
function loadDataFromStorage() {
  const storedTx = localStorage.getItem('finanzapro_tx');
  const storedSettings = localStorage.getItem('finanzapro_settings');
  const storedCategories = localStorage.getItem('finanzapro_categories');

  if (storedTx) {
    try {
      appState.transactions = JSON.parse(storedTx);
    } catch (e) {
      console.error('Error parseando transacciones:', e);
      appState.transactions = [];
    }
  }

  if (storedSettings) {
    try {
      appState.settings = { ...appState.settings, ...JSON.parse(storedSettings) };
    } catch (e) {
      console.error('Error parseando settings:', e);
    }
  }

  // Detectar si se abrió a través de un link con parámetros personalizados (?titulo=... / ?nombre=...)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('titulo')) {
      appState.settings.docTitle = decodeURIComponent(urlParams.get('titulo'));
    }
    if (urlParams.has('nombre')) {
      appState.settings.userName = decodeURIComponent(urlParams.get('nombre'));
      if (!urlParams.has('titulo')) {
        appState.settings.docTitle = `Ingresos y Egresos ${appState.settings.userName}`;
      }
    }
  } catch (err) {
    console.error('Error leyendo parámetros URL:', err);
  }

  if (storedCategories) {
    try {
      appState.categories = JSON.parse(storedCategories);
    } catch (e) {
      console.error('Error parseando categories:', e);
    }
  }

  updateCurrencySymbols();
}

// ================= BRANDING Y TÍTULO PERSONALIZADO =================
function updateDocumentBranding() {
  const docTitle = appState.settings.docTitle || 'Ingresos y Egresos Jhonatan Salas';
  const userName = appState.settings.userName || 'Jhonatan Salas';

  // Actualizar etiqueta del navegador <title>
  document.title = `${docTitle} - FinanzaPro`;

  // Encabezado principal del dashboard
  const mainHeading = document.getElementById('mainHeadingTitle');
  if (mainHeading) mainHeading.textContent = docTitle;

  // Badge del usuario en navbar
  const navbarUser = document.getElementById('navbarUserName');
  if (navbarUser) navbarUser.textContent = userName;

  // Actualizar inputs en modales si existen
  const quickDocTitle = document.getElementById('quickDocTitle');
  if (quickDocTitle) quickDocTitle.value = docTitle;

  const quickUserName = document.getElementById('quickUserName');
  if (quickUserName) quickUserName.value = userName;

  const configDocTitle = document.getElementById('configDocTitle');
  if (configDocTitle) configDocTitle.value = docTitle;

  const configUserName = document.getElementById('configUserName');
  if (configUserName) configUserName.value = userName;
}

function saveDataToStorage() {
  localStorage.setItem('finanzapro_tx', JSON.stringify(appState.transactions));
  localStorage.setItem('finanzapro_settings', JSON.stringify(appState.settings));
  localStorage.setItem('finanzapro_categories', JSON.stringify(appState.categories));
}

// ================= TEMA OSCURO / CLARO =================
function initTheme() {
  const isDark = localStorage.getItem('finanzapro_theme') === 'dark' ||
    (!('finanzapro_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const willBeDark = !document.documentElement.classList.contains('dark');
      if (willBeDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('finanzapro_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('finanzapro_theme', 'light');
      }
      // Actualizar estilo visual de los gráficos
      updateChartColors();
    });
  }
}

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

// ================= EVENT LISTENERS =================
function setupEventListeners() {
  // Switch Tipo en Formulario (Ingreso / Egreso)
  const btnTypeExpense = document.getElementById('btnTypeExpense');
  const btnTypeIncome = document.getElementById('btnTypeIncome');
  const txTypeInput = document.getElementById('txType');

  if (btnTypeExpense && btnTypeIncome) {
    btnTypeExpense.addEventListener('click', () => {
      txTypeInput.value = 'expense';
      btnTypeExpense.className = 'py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition bg-rose-600 text-white shadow-sm';
      btnTypeIncome.className = 'py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition text-slate-600 dark:text-slate-300 hover:text-slate-900';
      populateCategorySelects('expense');
    });

    btnTypeIncome.addEventListener('click', () => {
      txTypeInput.value = 'income';
      btnTypeIncome.className = 'py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition bg-emerald-600 text-white shadow-sm';
      btnTypeExpense.className = 'py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition text-slate-600 dark:text-slate-300 hover:text-slate-900';
      populateCategorySelects('income');
    });
  }

  // Envío del Formulario de Registro
  const form = document.getElementById('transactionForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAddTransaction();
    });
  }

  // Filtro de Período Temporal
  const periodButtons = document.querySelectorAll('.filter-period-btn');
  periodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      periodButtons.forEach(b => {
        b.classList.remove('active-period', 'bg-white', 'dark:bg-slate-700', 'text-indigo-600', 'dark:text-indigo-300', 'shadow-sm');
        b.classList.add('text-slate-600', 'dark:text-slate-400');
      });
      btn.classList.add('active-period', 'bg-white', 'dark:bg-slate-700', 'text-indigo-600', 'dark:text-indigo-300', 'shadow-sm');
      btn.classList.remove('text-slate-600', 'dark:text-slate-400');
      
      appState.currentPeriod = btn.dataset.period;
      renderAll();
    });
  });

  // Switch de tipo de gráfico comparativo (Barras vs Líneas)
  const btnChartBar = document.getElementById('btnChartBar');
  const btnChartLine = document.getElementById('btnChartLine');
  if (btnChartBar && btnChartLine) {
    btnChartBar.addEventListener('click', () => {
      appState.chartComparisonType = 'bar';
      btnChartBar.className = 'px-2.5 py-1 text-xs font-semibold rounded-md bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-300';
      btnChartLine.className = 'px-2.5 py-1 text-xs font-semibold rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900';
      renderMonthlyComparisonChart();
    });
    btnChartLine.addEventListener('click', () => {
      appState.chartComparisonType = 'line';
      btnChartLine.className = 'px-2.5 py-1 text-xs font-semibold rounded-md bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-300';
      btnChartBar.className = 'px-2.5 py-1 text-xs font-semibold rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900';
      renderMonthlyComparisonChart();
    });
  }

  // Filtros de la tabla (Buscador y Tipo)
  const tableSearchInput = document.getElementById('tableSearchInput');
  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', (e) => {
      appState.tableFilter.search = e.target.value.toLowerCase().trim();
      renderTransactionsTable();
    });
  }

  const tableTypeFilter = document.getElementById('tableTypeFilter');
  if (tableTypeFilter) {
    tableTypeFilter.addEventListener('change', (e) => {
      appState.tableFilter.type = e.target.value;
      renderTransactionsTable();
    });
  }

  // Botón Cargar Datos Demo
  const btnLoadDemo = document.getElementById('btnLoadDemo');
  if (btnLoadDemo) {
    btnLoadDemo.addEventListener('click', () => {
      if (appState.transactions.length > 0) {
        if (!confirm('¿Deseas agregar transacciones de ejemplo a las existentes? Podrás ver las estadísticas completas de inmediato.')) {
          return;
        }
      }
      loadDemoData();
    });
  }

  // Modales
  setupModals();
}

// ================= MODALES Y DIÁLOGOS =================
function setupModals() {
  // Modal de Configuración
  const configModal = document.getElementById('configModal');
  const btnConfigModal = document.getElementById('btnConfigModal');
  const btnCloseConfigModal = document.getElementById('btnCloseConfigModal');
  const btnSaveConfig = document.getElementById('btnSaveConfig');
  const configCurrencySelect = document.getElementById('configCurrencySelect');
  const configSavingTarget = document.getElementById('configSavingTarget');
  const btnClearAllData = document.getElementById('btnClearAllData');

  if (btnConfigModal && configModal) {
    btnConfigModal.addEventListener('click', () => {
      configCurrencySelect.value = appState.settings.currency;
      configSavingTarget.value = appState.settings.savingsTarget;
      
      const configDocTitle = document.getElementById('configDocTitle');
      if (configDocTitle) configDocTitle.value = appState.settings.docTitle;
      const configUserName = document.getElementById('configUserName');
      if (configUserName) configUserName.value = appState.settings.userName;

      configModal.classList.remove('hidden');
    });

    btnCloseConfigModal.addEventListener('click', () => configModal.classList.add('hidden'));

    btnSaveConfig.addEventListener('click', () => {
      appState.settings.currency = configCurrencySelect.value;
      appState.settings.savingsTarget = parseFloat(configSavingTarget.value) || 20;

      const configDocTitle = document.getElementById('configDocTitle');
      if (configDocTitle && configDocTitle.value.trim()) {
        appState.settings.docTitle = configDocTitle.value.trim();
      }

      const configUserName = document.getElementById('configUserName');
      if (configUserName && configUserName.value.trim()) {
        appState.settings.userName = configUserName.value.trim();
      }

      saveDataToStorage();
      updateCurrencySymbols();
      updateDocumentBranding();
      renderAll();
      configModal.classList.add('hidden');
      showToast('Configuración y título actualizados', 'success');
    });

    btnClearAllData.addEventListener('click', () => {
      if (confirm('¿ESTÁS SEGURO? Se borrarán todos los movimientos registrados permanentemente.')) {
        appState.transactions = [];
        saveDataToStorage();
        renderAll();
        configModal.classList.add('hidden');
        showToast('Todos los datos han sido borrados', 'warning');
      }
    });
  }

  // Modal de Personalización de Título Rápido
  const titleModal = document.getElementById('titleModal');
  const btnQuickEditTitle = document.getElementById('btnQuickEditTitle');
  const navbarUserBadge = document.getElementById('navbarUserBadge');
  const btnCloseTitleModal = document.getElementById('btnCloseTitleModal');
  const btnCancelTitleModal = document.getElementById('btnCancelTitleModal');
  const quickTitleForm = document.getElementById('quickTitleForm');

  const openTitleModal = () => {
    if (!titleModal) return;
    const quickDocTitle = document.getElementById('quickDocTitle');
    const quickUserName = document.getElementById('quickUserName');
    if (quickDocTitle) quickDocTitle.value = appState.settings.docTitle;
    if (quickUserName) quickUserName.value = appState.settings.userName;
    titleModal.classList.remove('hidden');
  };

  if (btnQuickEditTitle) btnQuickEditTitle.addEventListener('click', openTitleModal);
  if (navbarUserBadge) navbarUserBadge.addEventListener('click', openTitleModal);
  if (btnCloseTitleModal) btnCloseTitleModal.addEventListener('click', () => titleModal.classList.add('hidden'));
  if (btnCancelTitleModal) btnCancelTitleModal.addEventListener('click', () => titleModal.classList.add('hidden'));

  if (quickTitleForm) {
    quickTitleForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newTitle = document.getElementById('quickDocTitle').value.trim();
      const newName = document.getElementById('quickUserName').value.trim();
      if (newTitle) appState.settings.docTitle = newTitle;
      if (newName) appState.settings.userName = newName;

      saveDataToStorage();
      updateDocumentBranding();
      titleModal.classList.add('hidden');
      showToast('Título personalizado guardado exitosamente', 'success');
    });
  }

  // Modal de Compartir Link
  const shareModal = document.getElementById('shareModal');
  const btnShareModal = document.getElementById('btnShareModal');
  const btnCloseShareModal = document.getElementById('btnCloseShareModal');
  const btnFinishShare = document.getElementById('btnFinishShare');
  const shareUrlInput = document.getElementById('shareUrlInput');
  const btnCopyShareUrl = document.getElementById('btnCopyShareUrl');
  const btnShareWhatsApp = document.getElementById('btnShareWhatsApp');
  const btnShareEmail = document.getElementById('btnShareEmail');

  const updateShareLinks = () => {
    const docTitle = appState.settings.docTitle || 'Ingresos y Egresos Jhonatan Salas';
    const userName = appState.settings.userName || 'Jhonatan Salas';
    
    let currentUrl = window.location.href.split('?')[0];
    let shareUrl = '';

    if (currentUrl.startsWith('file://')) {
      // En entorno de prueba local con archivo
      shareUrl = `https://tusitio.netlify.app/?titulo=${encodeURIComponent(docTitle)}&nombre=${encodeURIComponent(userName)}`;
    } else {
      shareUrl = `${currentUrl}?titulo=${encodeURIComponent(docTitle)}&nombre=${encodeURIComponent(userName)}`;
    }

    if (shareUrlInput) shareUrlInput.value = shareUrl;

    if (btnShareWhatsApp) {
      const msg = `Hola! Te comparto este panel de control financiero: ${docTitle}\nPuedes acceder aquí: ${shareUrl}`;
      btnShareWhatsApp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    }

    if (btnShareEmail) {
      btnShareEmail.href = `mailto:?subject=${encodeURIComponent(docTitle)}&body=${encodeURIComponent('Hola! Te comparto mi panel de control financiero:\n\n' + shareUrl)}`;
    }
  };

  if (btnShareModal && shareModal) {
    btnShareModal.addEventListener('click', () => {
      updateShareLinks();
      shareModal.classList.remove('hidden');
    });
    if (btnCloseShareModal) btnCloseShareModal.addEventListener('click', () => shareModal.classList.add('hidden'));
    if (btnFinishShare) btnFinishShare.addEventListener('click', () => shareModal.classList.add('hidden'));
  }

  if (btnCopyShareUrl && shareUrlInput) {
    btnCopyShareUrl.addEventListener('click', () => {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(shareUrlInput.value).then(() => {
          showToast('¡Enlace copiado al portapapeles!', 'success');
        }).catch(() => {
          copyFallback(shareUrlInput);
        });
      } else {
        copyFallback(shareUrlInput);
      }
    });
  }

  function copyFallback(input) {
    input.select();
    input.setSelectionRange(0, 99999);
    try {
      document.execCommand('copy');
      showToast('¡Enlace copiado al portapapeles!', 'success');
    } catch (e) {
      showToast('Por favor copia el enlace manualmente', 'info');
    }
  }

  // Modal de Backup / Exportar
  const backupModal = document.getElementById('backupModal');
  const btnBackupModal = document.getElementById('btnBackupModal');
  const btnCloseBackupModal = document.getElementById('btnCloseBackupModal');
  const btnDownloadJSON = document.getElementById('btnDownloadJSON');
  const btnModalExportCSV = document.getElementById('btnModalExportCSV');
  const btnExportCSV = document.getElementById('btnExportCSV');
  const importJsonFileInput = document.getElementById('importJsonFileInput');

  if (btnBackupModal && backupModal) {
    btnBackupModal.addEventListener('click', () => backupModal.classList.remove('hidden'));
    btnCloseBackupModal.addEventListener('click', () => backupModal.classList.add('hidden'));
  }

  if (btnDownloadJSON) {
    btnDownloadJSON.addEventListener('click', exportBackupJSON);
  }

  if (btnModalExportCSV) {
    btnModalExportCSV.addEventListener('click', exportToCSV);
  }

  if (btnExportCSV) {
    btnExportCSV.addEventListener('click', exportToCSV);
  }

  if (importJsonFileInput) {
    importJsonFileInput.addEventListener('change', handleImportJSON);
  }

  // Modal de Nueva Categoría
  const categoryModal = document.getElementById('categoryModal');
  const btnManageCategories = document.getElementById('btnManageCategories');
  const btnCloseCategoryModal = document.getElementById('btnCloseCategoryModal');
  const btnCancelCategory = document.getElementById('btnCancelCategory');
  const newCategoryForm = document.getElementById('newCategoryForm');

  if (btnManageCategories && categoryModal) {
    btnManageCategories.addEventListener('click', () => {
      document.getElementById('newCatType').value = document.getElementById('txType').value;
      categoryModal.classList.remove('hidden');
    });
    btnCloseCategoryModal.addEventListener('click', () => categoryModal.classList.add('hidden'));
    btnCancelCategory.addEventListener('click', () => categoryModal.classList.add('hidden'));

    newCategoryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const type = document.getElementById('newCatType').value;
      const catName = document.getElementById('newCatName').value.trim();

      if (catName && !appState.categories[type].includes(catName)) {
        appState.categories[type].push(catName);
        saveDataToStorage();
        populateCategorySelects(type);
        categoryModal.classList.add('hidden');
        document.getElementById('newCatName').value = '';
        showToast(`Categoría "${catName}" añadida`, 'success');
      } else {
        showToast('Esa categoría ya existe o es inválida', 'warning');
      }
    });
  }

  // Modal de Edición de Movimiento
  const editModal = document.getElementById('editModal');
  const btnCloseEditModal = document.getElementById('btnCloseEditModal');
  const btnCancelEdit = document.getElementById('btnCancelEdit');
  const editTransactionForm = document.getElementById('editTransactionForm');
  const editTxType = document.getElementById('editTxType');

  if (btnCloseEditModal && editModal) {
    btnCloseEditModal.addEventListener('click', () => editModal.classList.add('hidden'));
    btnCancelEdit.addEventListener('click', () => editModal.classList.add('hidden'));

    editTxType.addEventListener('change', () => {
      populateEditCategories(editTxType.value);
    });

    editTransactionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveEditedTransaction();
    });
  }
}

// ================= GESTIÓN DE CATEGORÍAS =================
function populateCategorySelects(selectedType = null) {
  const currentType = selectedType || document.getElementById('txType')?.value || 'expense';
  const categorySelect = document.getElementById('txCategory');
  
  if (!categorySelect) return;

  const categories = appState.categories[currentType] || [];
  categorySelect.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function populateEditCategories(type, selectedCategory = '') {
  const editCategorySelect = document.getElementById('editTxCategory');
  if (!editCategorySelect) return;

  const categories = appState.categories[type] || [];
  editCategorySelect.innerHTML = categories.map(cat => 
    `<option value="${cat}" ${cat === selectedCategory ? 'selected' : ''}>${cat}</option>`
  ).join('');
}

// ================= AGREGAR Y EDITAR MOVIMIENTOS =================
function handleAddTransaction() {
  const type = document.getElementById('txType').value;
  const amount = parseFloat(document.getElementById('txAmount').value);
  const category = document.getElementById('txCategory').value;
  const description = document.getElementById('txDescription').value.trim();
  const date = document.getElementById('txDate').value;
  const paymentMethod = document.getElementById('txPaymentMethod').value;

  if (isNaN(amount) || amount <= 0) {
    showToast('Por favor introduce un monto válido mayor a 0', 'error');
    return;
  }

  if (!description) {
    showToast('Por favor escribe un concepto o detalle', 'error');
    return;
  }

  const newTx = {
    id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    type,
    amount,
    category,
    description,
    date: date || new Date().toISOString().split('T')[0],
    paymentMethod,
    createdAt: new Date().toISOString()
  };

  appState.transactions.unshift(newTx);
  saveDataToStorage();

  // Reset de campos manteniendo la fecha de hoy
  document.getElementById('txAmount').value = '';
  document.getElementById('txDescription').value = '';

  // Efecto visual divertido de confetti para ingresos
  if (type === 'income' && typeof confetti === 'function') {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });
  }

  showToast(`¡Movimiento registrado con éxito!`, 'success');
  renderAll();
}

function openEditModal(txId) {
  const tx = appState.transactions.find(t => t.id === txId);
  if (!tx) return;

  document.getElementById('editTxId').value = tx.id;
  document.getElementById('editTxType').value = tx.type;
  document.getElementById('editTxAmount').value = tx.amount;
  document.getElementById('editTxDescription').value = tx.description;
  document.getElementById('editTxDate').value = tx.date;
  document.getElementById('editTxPaymentMethod').value = tx.paymentMethod || 'Efectivo';

  populateEditCategories(tx.type, tx.category);

  document.getElementById('editModal').classList.remove('hidden');
}

function saveEditedTransaction() {
  const txId = document.getElementById('editTxId').value;
  const index = appState.transactions.findIndex(t => t.id === txId);
  if (index === -1) return;

  const type = document.getElementById('editTxType').value;
  const amount = parseFloat(document.getElementById('editTxAmount').value);
  const category = document.getElementById('editTxCategory').value;
  const description = document.getElementById('editTxDescription').value.trim();
  const date = document.getElementById('editTxDate').value;
  const paymentMethod = document.getElementById('editTxPaymentMethod').value;

  if (isNaN(amount) || amount <= 0) {
    showToast('Introduce un monto válido', 'error');
    return;
  }

  appState.transactions[index] = {
    ...appState.transactions[index],
    type,
    amount,
    category,
    description,
    date,
    paymentMethod,
    updatedAt: new Date().toISOString()
  };

  saveDataToStorage();
  document.getElementById('editModal').classList.add('hidden');
  showToast('Movimiento actualizado', 'success');
  renderAll();
}

function deleteTransaction(txId) {
  if (confirm('¿Eliminar este movimiento?')) {
    appState.transactions = appState.transactions.filter(t => t.id !== txId);
    saveDataToStorage();
    showToast('Movimiento eliminado', 'info');
    renderAll();
  }
}

// ================= FILTRADO TEMPORAL Y DE DATOS =================
function getFilteredTransactions() {
  const period = appState.currentPeriod;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  return appState.transactions.filter(tx => {
    if (!tx.date) return false;
    const txDate = new Date(tx.date + 'T00:00:00');

    if (period === 'this_month') {
      return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
    } else if (period === 'last_month') {
      const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      return txDate.getFullYear() === prevMonthYear && txDate.getMonth() === prevMonth;
    } else if (period === 'this_year') {
      return txDate.getFullYear() === currentYear;
    }
    return true; // 'all'
  });
}

// ================= RENDERIZADO GLOBAL =================
function renderAll() {
  const filteredTx = getFilteredTransactions();
  renderKPIs(filteredTx);
  renderFinancialInsights(filteredTx);
  renderCharts(filteredTx);
  renderTransactionsTable();
}

// ================= KPI METRIC CARDS =================
function renderKPIs(txList) {
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  txList.forEach(tx => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
      incomeCount++;
    } else {
      totalExpense += tx.amount;
      expenseCount++;
    }
  });

  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100) : 0;
  const expensePercent = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;

  // Actualizar valores en DOM
  document.getElementById('kpiTotalIncome').textContent = formatCurrency(totalIncome);
  document.getElementById('kpiIncomeCount').textContent = `${incomeCount} entrada${incomeCount === 1 ? '' : 's'}`;

  document.getElementById('kpiTotalExpense').textContent = formatCurrency(totalExpense);
  document.getElementById('kpiExpensePercent').textContent = `${expensePercent.toFixed(1)}%`;

  const netBalanceEl = document.getElementById('kpiNetBalance');
  const netBadgeEl = document.getElementById('kpiBalanceStatusBadge');
  const netNoteEl = document.getElementById('kpiBalanceNote');

  netBalanceEl.textContent = formatCurrency(netBalance);
  if (netBalance > 0) {
    netBalanceEl.className = 'text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400';
    netBadgeEl.className = 'px-2 py-0.5 rounded-full font-semibold text-[11px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300';
    netBadgeEl.textContent = 'Superávit Financiero';
    netNoteEl.textContent = 'Saldo positivo para ahorrar';
  } else if (netBalance < 0) {
    netBalanceEl.className = 'text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400';
    netBadgeEl.className = 'px-2 py-0.5 rounded-full font-semibold text-[11px] bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300';
    netBadgeEl.textContent = 'Déficit (Alerta)';
    netNoteEl.textContent = 'Gastas más de lo que ingresas';
  } else {
    netBalanceEl.className = 'text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100';
    netBadgeEl.className = 'px-2 py-0.5 rounded-full font-semibold text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
    netBadgeEl.textContent = 'Punto de Equilibrio';
    netNoteEl.textContent = 'Ingresos = Gastos';
  }

  // Tasa de Ahorro
  const target = appState.settings.savingsTarget || 20;
  document.getElementById('kpiSavingsRate').textContent = `${savingsRate.toFixed(1)}%`;
  const savingsBar = document.getElementById('kpiSavingsBar');
  const barWidth = Math.min(100, (savingsRate / target) * 100);
  savingsBar.style.width = `${barWidth}%`;

  if (savingsRate >= target) {
    savingsBar.className = 'bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500';
  } else {
    savingsBar.className = 'bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-500';
  }
}

// ================= DIAGNÓSTICO FINANCIERO INTELIGENTE =================
function renderFinancialInsights(txList) {
  const insightText = document.getElementById('insightText');
  const insightMetric = document.getElementById('insightMetric');

  if (txList.length === 0) {
    insightText.textContent = 'Añade movimientos o haz clic en "Datos Demo" arriba para ver el diagnóstico inteligente de tus finanzas.';
    insightMetric.textContent = 'Sin datos';
    return;
  }

  let totalIncome = 0;
  let totalExpense = 0;
  const expenseByCategory = {};

  txList.forEach(tx => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
      expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + tx.amount;
    }
  });

  // Categoría de mayor gasto
  let maxExpenseCat = '';
  let maxExpenseAmount = 0;
  for (const [cat, amt] of Object.entries(expenseByCategory)) {
    if (amt > maxExpenseAmount) {
      maxExpenseAmount = amt;
      maxExpenseCat = cat;
    }
  }

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
  const target = appState.settings.savingsTarget || 20;

  if (totalExpense > totalIncome && totalIncome > 0) {
    insightText.innerHTML = `<strong>⚠️ Déficit Financiero:</strong> Tus egresos superan tus ingresos por <strong>${formatCurrency(totalExpense - totalIncome)}</strong>. Te recomendamos recortar gastos en <strong>${maxExpenseCat || 'conceptos no esenciales'}</strong>.`;
    insightMetric.innerHTML = `<span class="text-rose-500 font-bold">Gastando ${((totalExpense/totalIncome)*100).toFixed(0)}%</span> del ingreso`;
  } else if (savingsRate >= target && totalIncome > 0) {
    const maxCatPercent = totalExpense > 0 ? ((maxExpenseAmount / totalExpense) * 100).toFixed(0) : 0;
    insightText.innerHTML = `<strong>🌟 ¡Excelente Salud Financiera!</strong> Estás ahorrando el <strong>${savingsRate.toFixed(1)}%</strong> de tus ingresos (meta: ${target}%). Tu mayor rubro de gasto es <strong>${maxExpenseCat}</strong> con ${maxCatPercent}% del total gastado.`;
    insightMetric.innerHTML = `<span class="text-emerald-500 font-bold">Meta Cumplida (${savingsRate.toFixed(0)}%)</span>`;
  } else if (totalIncome > 0) {
    const diff = (target - savingsRate).toFixed(1);
    insightText.innerHTML = `<strong>💡 Oportunidad de Ahorro:</strong> Tu tasa de ahorro es de <strong>${savingsRate.toFixed(1)}%</strong> (a ${diff}% de tu meta de ${target}%). Revisa tus gastos en <strong>${maxExpenseCat || 'servicios y ocio'}</strong> (${formatCurrency(maxExpenseAmount)}).`;
    insightMetric.innerHTML = `<span class="text-amber-500 font-bold">Tasa actual: ${savingsRate.toFixed(1)}%</span>`;
  } else {
    insightText.textContent = `Has registrado únicamente egresos en este período. Registra tus fuentes de ingreso para calcular tu balance y tasa de ahorro.`;
    insightMetric.textContent = `${txList.length} movimientos`;
  }
}

// ================= GRÁFICOS INTERACTIVOS (CHART.JS) =================
function renderCharts(txList) {
  renderMonthlyComparisonChart();
  renderExpenseCategoryChart(txList);
  renderIncomeCategoryChart(txList);
  renderBalanceTrendChart(txList);
}

// 1. Gráfico Comparativo Mensual (Ingresos vs Egresos por mes)
function renderMonthlyComparisonChart() {
  const ctx = document.getElementById('monthlyComparisonChart')?.getContext('2d');
  if (!ctx) return;

  // Agrupamos TODOS los movimientos históricos por mes (YYYY-MM)
  const monthlyData = {};

  appState.transactions.forEach(tx => {
    if (!tx.date) return;
    const monthKey = tx.date.substring(0, 7); // '2026-10'
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expense: 0 };
    }
    if (tx.type === 'income') {
      monthlyData[monthKey].income += tx.amount;
    } else {
      monthlyData[monthKey].expense += tx.amount;
    }
  });

  // Ordenar meses cronológicamente
  const sortedMonths = Object.keys(monthlyData).sort();
  
  // Limitar a los últimos 6 u 8 meses para máxima claridad
  const displayMonths = sortedMonths.slice(-8);

  const monthLabels = displayMonths.map(m => {
    const [year, month] = m.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
  });

  const incomeValues = displayMonths.map(m => monthlyData[m].income);
  const expenseValues = displayMonths.map(m => monthlyData[m].expense);

  const isDark = isDarkMode();
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  if (charts.monthlyComparison) {
    charts.monthlyComparison.destroy();
  }

  const chartType = appState.chartComparisonType || 'bar';

  charts.monthlyComparison = new Chart(ctx, {
    type: chartType,
    data: {
      labels: monthLabels.length > 0 ? monthLabels : ['Sin datos'],
      datasets: [
        {
          label: 'Ingresos',
          data: incomeValues.length > 0 ? incomeValues : [0],
          backgroundColor: chartType === 'bar' ? 'rgba(16, 185, 129, 0.85)' : 'rgba(16, 185, 129, 0.15)',
          borderColor: '#10b981',
          borderWidth: 2,
          borderRadius: chartType === 'bar' ? 6 : 0,
          fill: chartType === 'line',
          tension: 0.35
        },
        {
          label: 'Egresos',
          data: expenseValues.length > 0 ? expenseValues : [0],
          backgroundColor: chartType === 'bar' ? 'rgba(244, 63, 94, 0.85)' : 'rgba(244, 63, 94, 0.15)',
          borderColor: '#f43f5e',
          borderWidth: 2,
          borderRadius: chartType === 'bar' ? 6 : 0,
          fill: chartType === 'line',
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: textColor, font: { size: 12, weight: '600' } }
        },
        tooltip: {
          callbacks: {
            label: (context) => ` ${context.dataset.label}: ${formatCurrency(context.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            callback: (value) => formatCurrencyShort(value)
          }
        }
      }
    }
  });
}

// 2. Gráfico de Egresos por Categoría (Doughnut)
function renderExpenseCategoryChart(txList) {
  const ctx = document.getElementById('expenseCategoryChart')?.getContext('2d');
  if (!ctx) return;

  const categoryTotals = {};
  txList.filter(t => t.type === 'expense').forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);
  const isDark = isDarkMode();
  const textColor = isDark ? '#cbd5e1' : '#475569';

  if (charts.expenseCategory) {
    charts.expenseCategory.destroy();
  }

  if (labels.length === 0) {
    charts.expenseCategory = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Sin gastos registrados'],
        datasets: [{
          data: [1],
          backgroundColor: isDark ? ['#334155'] : ['#e2e8f0']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor } },
          tooltip: { enabled: false }
        }
      }
    });
    return;
  }

  charts.expenseCategory = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: CATEGORY_COLORS.slice(0, labels.length),
        borderWidth: 2,
        borderColor: isDark ? '#1e293b' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            color: textColor,
            font: { size: 11, weight: '500' }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const val = context.raw;
              const percent = ((val / total) * 100).toFixed(1);
              return ` ${context.label}: ${formatCurrency(val)} (${percent}%)`;
            }
          }
        }
      },
      cutout: '65%'
    }
  });
}

// 3. Gráfico de Ingresos por Categoría (Doughnut)
function renderIncomeCategoryChart(txList) {
  const ctx = document.getElementById('incomeCategoryChart')?.getContext('2d');
  if (!ctx) return;

  const categoryTotals = {};
  txList.filter(t => t.type === 'income').forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);
  const isDark = isDarkMode();
  const textColor = isDark ? '#cbd5e1' : '#475569';

  if (charts.incomeCategory) {
    charts.incomeCategory.destroy();
  }

  if (labels.length === 0) {
    charts.incomeCategory = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Sin ingresos en este período'],
        datasets: [{
          data: [1],
          backgroundColor: isDark ? ['#334155'] : ['#e2e8f0']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor } },
          tooltip: { enabled: false }
        }
      }
    });
    return;
  }

  const incomePalette = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#14b8a6'];

  charts.incomeCategory = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: incomePalette.slice(0, labels.length),
        borderWidth: 2,
        borderColor: isDark ? '#1e293b' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            color: textColor,
            font: { size: 11, weight: '500' }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const val = context.raw;
              const percent = ((val / total) * 100).toFixed(1);
              return ` ${context.label}: ${formatCurrency(val)} (${percent}%)`;
            }
          }
        }
      },
      cutout: '65%'
    }
  });
}

// 4. Gráfico de Tendencia del Balance Acumulado (Área Suave)
function renderBalanceTrendChart(txList) {
  const ctx = document.getElementById('balanceTrendChart')?.getContext('2d');
  if (!ctx) return;

  // Ordenar movimientos por fecha ascendente
  const sortedTx = [...txList].sort((a, b) => new Date(a.date) - new Date(b.date));

  const dates = [];
  const cumulativeBalances = [];
  let runningBalance = 0;

  sortedTx.forEach(tx => {
    runningBalance += (tx.type === 'income' ? tx.amount : -tx.amount);
    dates.push(formatDisplayDate(tx.date, true));
    cumulativeBalances.push(runningBalance);
  });

  const isDark = isDarkMode();
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  if (charts.balanceTrend) {
    charts.balanceTrend.destroy();
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

  charts.balanceTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates.length > 0 ? dates : ['Sin registros'],
      datasets: [{
        label: 'Balance Acumulado',
        data: cumulativeBalances.length > 0 ? cumulativeBalances : [0],
        borderColor: '#6366f1',
        backgroundColor: gradient,
        fill: true,
        borderWidth: 2.5,
        pointBackgroundColor: '#6366f1',
        pointRadius: dates.length > 20 ? 1 : 4,
        pointHoverRadius: 6,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => ` Balance: ${formatCurrency(context.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, maxTicksLimit: 8 }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            callback: (val) => formatCurrencyShort(val)
          }
        }
      }
    }
  });
}

function updateChartColors() {
  renderCharts(getFilteredTransactions());
}

// ================= TABLA DE MOVIMIENTOS =================
function renderTransactionsTable() {
  const tbody = document.getElementById('transactionTableBody');
  const emptyState = document.getElementById('tableEmptyState');
  const badgeCount = document.getElementById('txCountBadge');
  const paginationInfo = document.getElementById('paginationInfo');

  if (!tbody) return;

  const { search, type } = appState.tableFilter;
  const filteredList = appState.transactions.filter(tx => {
    // Filtro por tipo
    if (type !== 'all' && tx.type !== type) return false;
    
    // Filtro por buscador
    if (search) {
      const matchDesc = (tx.description || '').toLowerCase().includes(search);
      const matchCat = (tx.category || '').toLowerCase().includes(search);
      const matchMethod = (tx.paymentMethod || '').toLowerCase().includes(search);
      const matchAmt = tx.amount.toString().includes(search);
      if (!matchDesc && !matchCat && !matchMethod && !matchAmt) return false;
    }
    return true;
  });

  if (badgeCount) {
    badgeCount.textContent = `${filteredList.length} registro${filteredList.length === 1 ? '' : 's'} encontrado${filteredList.length === 1 ? '' : 's'}`;
  }

  if (paginationInfo) {
    paginationInfo.textContent = `Mostrando ${filteredList.length} de ${appState.transactions.length} movimientos en total`;
  }

  if (filteredList.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Renderizar filas con iconos dinámicos
  tbody.innerHTML = filteredList.map(tx => {
    const isIncome = tx.type === 'income';
    const amountSign = isIncome ? '+' : '-';
    const amountClass = isIncome 
      ? 'text-emerald-600 dark:text-emerald-400 font-bold' 
      : 'text-rose-600 dark:text-rose-400 font-bold';
    
    const iconClass = isIncome ? 'fa-arrow-up text-emerald-500' : 'fa-arrow-down text-rose-500';

    return `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <td class="py-3 px-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400">
          ${formatDisplayDate(tx.date)}
        </td>
        <td class="py-3 px-3.5 font-medium text-slate-900 dark:text-white">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${isIncome ? 'bg-emerald-100 dark:bg-emerald-950/80' : 'bg-rose-100 dark:bg-rose-950/80'}">
              <i class="fa-solid ${iconClass}"></i>
            </div>
            <span class="truncate max-w-[200px]" title="${escapeHtml(tx.description)}">${escapeHtml(tx.description)}</span>
          </div>
        </td>
        <td class="py-3 px-3.5 whitespace-nowrap">
          <span class="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            ${escapeHtml(tx.category)}
          </span>
        </td>
        <td class="py-3 px-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400 hidden sm:table-cell">
          <span class="inline-flex items-center gap-1">
            <i class="fa-regular fa-credit-card text-xs text-slate-400"></i>
            ${escapeHtml(tx.paymentMethod || 'Efectivo')}
          </span>
        </td>
        <td class="py-3 px-3.5 whitespace-nowrap text-right ${amountClass}">
          ${amountSign} ${formatCurrency(tx.amount)}
        </td>
        <td class="py-3 px-3.5 whitespace-nowrap text-center no-print">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="openEditModal('${tx.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition" title="Editar">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button onclick="deleteTransaction('${tx.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition" title="Eliminar">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ================= EXPORTACIÓN E IMPORTACIÓN =================
function exportToCSV() {
  if (appState.transactions.length === 0) {
    showToast('No hay transacciones para exportar', 'warning');
    return;
  }

  // BOM UTF-8 para que Microsoft Excel en español reconozca tildes y caracteres especiales
  let csvContent = '\uFEFF';
  csvContent += 'ID;Fecha;Tipo;Concepto;Categoría;Método de Pago;Monto;Moneda\r\n';

  appState.transactions.forEach(t => {
    const row = [
      t.id,
      t.date,
      t.type === 'income' ? 'Ingreso' : 'Egreso',
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${(t.paymentMethod || '').replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
      appState.settings.currency
    ];
    csvContent += row.join(';') + '\r\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `FinanzaPro_Movimientos_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Archivo CSV exportado exitosamente', 'success');
}

function exportBackupJSON() {
  if (appState.transactions.length === 0) {
    showToast('No hay datos registrados aún', 'warning');
    return;
  }

  const exportData = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    settings: appState.settings,
    categories: appState.categories,
    transactions: appState.transactions
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `FinanzaPro_Backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Copia de seguridad JSON descargada', 'success');
}

function handleImportJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data && Array.isArray(data.transactions)) {
        appState.transactions = data.transactions;
        if (data.settings) appState.settings = { ...appState.settings, ...data.settings };
        if (data.categories) appState.categories = { ...appState.categories, ...data.categories };

        saveDataToStorage();
        updateCurrencySymbols();
        populateCategorySelects();
        renderAll();

        document.getElementById('backupModal').classList.add('hidden');
        showToast(`Se importaron ${data.transactions.length} transacciones correctamente`, 'success');
      } else {
        showToast('El formato del archivo JSON no es válido', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al leer el archivo de respaldo', 'error');
    }
  };
  reader.readAsText(file);
}

// ================= DATOS DEMO AUTOMÁTICOS =================
function loadDemoData() {
  const today = new Date();
  
  // Generar transacciones realistas para los últimos 3 meses
  const demoTransactions = [
    // Mes actual
    { id: 'tx_demo_1', type: 'income', amount: 2800, category: 'Salario / Sueldo Principal', description: 'Pago de Nómina Mensual', date: getRelativeDate(0, -2), paymentMethod: 'Transferencia' },
    { id: 'tx_demo_2', type: 'income', amount: 450, category: 'Trabajo Freelance / Honorarios', description: 'Diseño de Identidad Visual Cliente', date: getRelativeDate(0, -6), paymentMethod: 'Transferencia' },
    { id: 'tx_demo_3', type: 'expense', amount: 650, category: 'Vivienda y Alquiler', description: 'Pago Alquiler Apartamento', date: getRelativeDate(0, -3), paymentMethod: 'Transferencia' },
    { id: 'tx_demo_4', type: 'expense', amount: 220, category: 'Alimentación y Comidas', description: 'Mercado Quincenal Supermercado', date: getRelativeDate(0, -5), paymentMethod: 'Tarjeta de Débito' },
    { id: 'tx_demo_5', type: 'expense', amount: 85, category: 'Servicios Públicos (Luz, Agua, Gas)', description: 'Factura de Electricidad y Agua', date: getRelativeDate(0, -7), paymentMethod: 'Transferencia' },
    { id: 'tx_demo_6', type: 'expense', amount: 60, category: 'Transporte y Gasolina', description: 'Carga de Gasolina Vehículo', date: getRelativeDate(0, -8), paymentMethod: 'Tarjeta de Débito' },
    { id: 'tx_demo_7', type: 'expense', amount: 75, category: 'Ocio y Entretenimiento', description: 'Cena con Amigos Restaurante', date: getRelativeDate(0, -9), paymentMethod: 'Tarjeta de Crédito' },
    { id: 'tx_demo_8', type: 'expense', amount: 25, category: 'Suscripciones Digitales', description: 'Netflix + Spotify Familiar', date: getRelativeDate(0, -10), paymentMethod: 'Tarjeta de Crédito' },
    
    // Mes anterior
    { id: 'tx_demo_9', type: 'income', amount: 2800, category: 'Salario / Sueldo Principal', description: 'Pago de Nómina Mensual', date: getRelativeDate(-1, 1), paymentMethod: 'Transferencia' },
    { id: 'tx_demo_10', type: 'income', amount: 320, category: 'Ventas / Negocio Propio', description: 'Venta de productos en línea', date: getRelativeDate(-1, 12), paymentMethod: 'Transferencia' },
    { id: 'tx_demo_11', type: 'expense', amount: 650, category: 'Vivienda y Alquiler', description: 'Pago Alquiler Apartamento', date: getRelativeDate(-1, 2), paymentMethod: 'Transferencia' },
    { id: 'tx_demo_12', type: 'expense', amount: 290, category: 'Alimentación y Comidas', description: 'Compras Varias Alimentos', date: getRelativeDate(-1, 14), paymentMethod: 'Tarjeta de Débito' },
    { id: 'tx_demo_13', type: 'expense', amount: 110, category: 'Salud y Medicina', description: 'Consulta odontológica y limpieza', date: getRelativeDate(-1, 18), paymentMethod: 'Efectivo' },
    { id: 'tx_demo_14', type: 'expense', amount: 95, category: 'Transporte y Gasolina', description: 'Gasolina y Mantenimiento Menor', date: getRelativeDate(-1, 20), paymentMethod: 'Tarjeta de Débito' },
    { id: 'tx_demo_15', type: 'expense', amount: 120, category: 'Educación y Cursos', description: 'Curso de Desarrollo Web', date: getRelativeDate(-1, 22), paymentMethod: 'Tarjeta de Crédito' },

    // Hace 2 meses
    { id: 'tx_demo_16', type: 'income', amount: 2800, category: 'Salario / Sueldo Principal', description: 'Pago de Nómina Mensual', date: getRelativeDate(-2, 1), paymentMethod: 'Transferencia' },
    { id: 'tx_demo_17', type: 'income', amount: 600, category: 'Bonificaciones y Aguinaldo', description: 'Bono por cumplimiento de objetivos', date: getRelativeDate(-2, 15), paymentMethod: 'Transferencia' },
    { id: 'tx_demo_18', type: 'expense', amount: 650, category: 'Vivienda y Alquiler', description: 'Pago Alquiler Apartamento', date: getRelativeDate(-2, 2), paymentMethod: 'Transferencia' },
    { id: 'tx_demo_19', type: 'expense', amount: 280, category: 'Alimentación y Comidas', description: 'Supermercado e Ingredientes', date: getRelativeDate(-2, 10), paymentMethod: 'Tarjeta de Débito' },
    { id: 'tx_demo_20', type: 'expense', amount: 130, category: 'Ropa y Accesorios', description: 'Zapatos deportivos en rebaja', date: getRelativeDate(-2, 21), paymentMethod: 'Tarjeta de Crédito' }
  ];

  appState.transactions = demoTransactions;
  saveDataToStorage();
  renderAll();

  if (typeof confetti === 'function') {
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  showToast('¡Datos de demostración cargados! Revisa tus gráficos interactivos.', 'success');
}

function getRelativeDate(monthOffset, dayOfMonth) {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset);
  if (dayOfMonth < 0) {
    d.setDate(d.getDate() + dayOfMonth);
  } else {
    d.setDate(dayOfMonth);
  }
  return d.toISOString().split('T')[0];
}

// ================= UTILIDADES DE FORMATO Y MONEDA =================
function updateCurrencySymbols() {
  const symbols = document.querySelectorAll('.currency-symbol');
  symbols.forEach(el => {
    el.textContent = appState.settings.currency || '$';
  });
}

function formatCurrency(val) {
  const symbol = appState.settings.currency || '$';
  return `${symbol} ${Number(val).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCurrencyShort(val) {
  const symbol = appState.settings.currency || '$';
  if (Math.abs(val) >= 1000000) {
    return `${symbol} ${(val / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(val) >= 1000) {
    return `${symbol} ${(val / 1000).toFixed(0)}k`;
  }
  return `${symbol} ${val}`;
}

function formatDisplayDate(dateStr, short = false) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const date = new Date(year, parseInt(month) - 1, parseInt(day));
  
  if (short) {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ================= NOTIFICACIONES TOAST =================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-indigo-600 text-white'
  };

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold ${bgColors[type] || bgColors.info} transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info} text-sm"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
