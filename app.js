// Configuración de Supabase
const SUPABASE_URL = 'https://linuhhqhtxrodrzuheeu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnVoaHFodHhyb2RyenVoZWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTUyMjAsImV4cCI6MjA4Nzc5MTIyMH0.oPyRsa6ZcrhijDFT-FQKjvkPTYvW5sE8C_aEt-OQ0Vc';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Número de WhatsApp (sin espacios ni símbolos, solo números)
const WHATSAPP_NUMBER = '5493804949550';

// Variables globales
let fechaActual = new Date();
let fechaSeleccionada = null;
let horaSeleccionada = null;
let turnosCargados = [];
let horariosDisponibles = [];
let diasBloqueados = [];
let archivoImagen = null;
let imagenPublicUrl = null;
let currentStep = 1;

// ========== FUNCIONES COMPARTIDAS ==========
async function cargarTurnos() {
    const { data, error } = await supabaseClient
        .from('turnos')
        .select('*')
        .order('fecha', { ascending: true });
    
    if (!error) turnosCargados = data || [];
    return turnosCargados;
}

async function cargarHorarios() {
    const { data, error } = await supabaseClient
        .from('horarios')
        .select('*')
        .eq('activo', true)
        .order('hora');
    
    if (!error) horariosDisponibles = data || [];
    return horariosDisponibles;
}

async function cargarDiasBloqueados() {
    const { data, error } = await supabaseClient
        .from('dias_bloqueados')
        .select('*');
    
    if (!error) diasBloqueados = data || [];
    return diasBloqueados;
}

function formatearFecha(fecha) {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${anio}-${mes}-${dia}`;
}

function formatearFechaLegible(fechaStr) {
    if (!fechaStr) return '';
    const [anio, mes, dia] = fechaStr.split('-');
    return `${dia}/${mes}/${anio}`;
}

function formatearFechaWhatsApp(fechaStr) {
    if (!fechaStr) return '';
    const [anio, mes, dia] = fechaStr.split('-');
    return `${dia}/${mes}/${anio}`;
}

function esFinde(fecha) {
    const dia = fecha.getDay();
    return dia === 0 || dia === 6;
}

function diaEstaBloqueado(fechaStr) {
    return diasBloqueados.some(d => d.fecha === fechaStr);
}

// Optimización para rendimiento en móviles
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== FUNCIONES DE NAVEGACIÓN ==========
function nextStep(step) {
    if (step === 2 && !validarPaso1()) {
        mostrarNotificacion('Completá todos tus datos primero 💅', 'info');
        return;
    }
    
    if (step === 3 && !fechaSeleccionada) {
        mostrarNotificacion('Seleccioná una fecha 📅', 'info');
        return;
    }
    
    // Ocultar todos los pasos
    document.querySelectorAll('.step-content').forEach(el => {
        el.classList.remove('active');
    });
    
    // Mostrar el paso seleccionado
    const stepElement = document.getElementById(`step${step}`);
    if (stepElement) {
        stepElement.classList.add('active');
    }
    
    // Actualizar progress bar
    document.querySelectorAll('.progress-step').forEach((el, index) => {
        if (index + 1 <= step) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
    
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.setAttribute('data-step', step);
    }
    
    currentStep = step;
    
    if (step === 3) {
        actualizarResumen();
    }
    
    // Scroll suave al inicio del paso (importante en móvil)
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevStep(step) {
    document.querySelectorAll('.step-content').forEach(el => {
        el.classList.remove('active');
    });
    
    const stepElement = document.getElementById(`step${step}`);
    if (stepElement) {
        stepElement.classList.add('active');
    }
    
    document.querySelectorAll('.progress-step').forEach((el, index) => {
        if (index + 1 <= step) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
    
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.setAttribute('data-step', step);
    }
    
    currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validarPaso1() {
    const nombre = document.getElementById('nombre')?.value?.trim() || '';
    const apellido = document.getElementById('apellido')?.value?.trim() || '';
    const imagen = document.getElementById('imagen')?.files[0];
    
    const btnToStep3 = document.getElementById('btn-to-step3');
    
    if (btnToStep3) {
        if (nombre && apellido && imagen) {
            btnToStep3.disabled = false;
            btnToStep3.classList.add('pulse');
            return true;
        } else {
            btnToStep3.disabled = true;
            btnToStep3.classList.remove('pulse');
            return false;
        }
    }
    return false;
}

// ========== FUNCIONES DEL CALENDARIO ==========
function cambiarMes(delta) {
    fechaActual.setMonth(fechaActual.getMonth() + delta);
    renderizarCalendario();
}

function renderizarCalendario() {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const monthElement = document.getElementById('current-month');
    if (monthElement) {
        monthElement.textContent = `${monthNames[fechaActual.getMonth()]} ${fechaActual.getFullYear()}`;
    }
    
    const primerDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
    const ultimoDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);
    
    // Obtener fecha de HOY
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    let html = '';
    
    // Días del mes anterior (para alinear)
    const diaSemanaPrimero = primerDia.getDay();
    const diasAntes = diaSemanaPrimero === 0 ? 6 : diaSemanaPrimero - 1;
    for (let i = 0; i < diasAntes; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    // Días del mes actual
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
        const fecha = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), i);
        fecha.setHours(0, 0, 0, 0);
        const fechaStr = formatearFecha(fecha);
        
        const esFechaPasada = fecha < hoy;
        const esFindeSemana = esFinde(fecha);
        const esBloqueado = diaEstaBloqueado(fechaStr);
        const turnosEnFecha = turnosCargados.filter(t => t.fecha === fechaStr);
        
        let clase = 'calendar-day';
        
        if (esFindeSemana) {
            clase += ' weekend';
        } else if (esFechaPasada) {
            clase += ' pasado';
        } else if (esBloqueado) {
            clase += ' unavailable';
        } else if (turnosEnFecha.length >= horariosDisponibles.length) {
            clase += ' ocupado';
        } else {
            clase += ' available';
        }
        
        const seleccionable = !esFindeSemana && !esFechaPasada && !esBloqueado && turnosEnFecha.length < horariosDisponibles.length;
        const onclickAttr = seleccionable ? `onclick="window.seleccionarDia('${fechaStr}')"` : '';
        
        html += `<div class="${clase}" data-fecha="${fechaStr}" ${onclickAttr}>${i}</div>`;
    }
    
    const calendarElement = document.getElementById('calendar-days');
    if (calendarElement) {
        calendarElement.innerHTML = html;
    }
}

function seleccionarDia(fechaStr) {
    if (!fechaStr) return;
    
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    const diaElement = document.querySelector(`[data-fecha="${fechaStr}"]`);
    if (diaElement) {
        diaElement.classList.add('selected');
    }
    
    fechaSeleccionada = fechaStr;
    
    const fechaDisplay = document.getElementById('fecha-seleccionada-display');
    if (fechaDisplay) {
        fechaDisplay.textContent = formatearFechaLegible(fechaStr);
    }
    
    mostrarHorariosDisponibles(fechaStr);
    
    const btnToStep3 = document.getElementById('btn-to-step3');
    if (btnToStep3) {
        btnToStep3.disabled = false;
        btnToStep3.classList.add('pulse');
    }
}

function mostrarHorariosDisponibles(fechaStr) {
    const horariosContainer = document.getElementById('horarios-container');
    if (!horariosContainer) return;
    
    const turnosEnFecha = turnosCargados.filter(t => t.fecha === fechaStr);
    const horasOcupadas = turnosEnFecha.map(t => t.hora);
    
    let html = '';
    horariosDisponibles.forEach(h => {
        const ocupado = horasOcupadas.includes(h.hora);
        const onclickAttr = !ocupado ? `onclick="window.seleccionarHora('${h.hora}')"` : '';
        html += `<div class="horario-item ${ocupado ? 'ocupado' : ''}" data-hora="${h.hora}" ${onclickAttr}><span>${h.hora}</span></div>`;
    });
    
    horariosContainer.innerHTML = html;
}

function seleccionarHora(hora) {
    document.querySelectorAll('.horario-item').forEach(el => {
        el.classList.remove('selected');
    });
    
    const horaElement = document.querySelector(`[data-hora="${hora}"]`);
    if (horaElement && !horaElement.classList.contains('ocupado')) {
        horaElement.classList.add('selected');
        horaSeleccionada = hora;
        actualizarResumen();
    }
}

function actualizarResumen() {
    const nombre = document.getElementById('nombre')?.value || '';
    const apellido = document.getElementById('apellido')?.value || '';
    
    const resumenContainer = document.getElementById('resumen-contenido');
    if (!resumenContainer) return;
    
    let html = '';
    
    if (nombre && apellido) {
        html += `
            <div class="resumen-item">
                <strong>Cliente</strong>
                <p>${nombre} ${apellido}</p>
            </div>
        `;
    }
    
    if (fechaSeleccionada) {
        html += `
            <div class="resumen-item">
                <strong>Fecha</strong>
                <p>${formatearFechaLegible(fechaSeleccionada)}</p>
            </div>
        `;
    }
    
    if (horaSeleccionada) {
        html += `
            <div class="resumen-item">
                <strong>Hora</strong>
                <p>${horaSeleccionada} hs</p>
            </div>
        `;
    }
    
    resumenContainer.innerHTML = html || '<p class="text-muted">Completá los datos para ver el resumen</p>';
}

// ========== SUBIDA DE IMAGEN ==========
function previewImagen(event) {
    const file = event.target.files[0];
    if (file) {
        // Validar tamaño (máx 5MB para móvil)
        if (file.size > 5 * 1024 * 1024) {
            mostrarNotificacion('La imagen es muy grande (máx 5MB)', 'error');
            event.target.value = '';
            return;
        }
        
        archivoImagen = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('preview');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
        validarPaso1();
    }
}

async function subirImagen() {
    if (!archivoImagen) return null;
    
    try {
        const fileExt = archivoImagen.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabaseClient.storage
            .from('imagenes-uvas')
            .upload(fileName, archivoImagen, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabaseClient.storage
            .from('imagenes-uvas')
            .getPublicUrl(fileName);
        
        return publicUrl;
        
    } catch (error) {
        console.error('Error subiendo imagen:', error);
        throw error;
    }
}

// ========== RESERVA CON WHATSAPP ==========
async function reservarTurno() {
    const nombre = document.getElementById('nombre')?.value?.trim();
    const apellido = document.getElementById('apellido')?.value?.trim();
    
    if (!nombre || !apellido || !archivoImagen || !fechaSeleccionada || !horaSeleccionada) {
        mostrarNotificacion('Completá todos los campos 💅', 'error');
        return;
    }
    
    const btnReservar = document.getElementById('reservar-btn');
    const textoOriginal = btnReservar.innerHTML;
    btnReservar.disabled = true;
    btnReservar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    
    try {
        // Subir imagen primero
        mostrarNotificacion('Subiendo imagen...', 'info');
        const imagenUrl = await subirImagen();
        
        if (!imagenUrl) throw new Error('No se pudo subir la imagen');
        
        // Guardar en Supabase
        const { error: dbError } = await supabaseClient
            .from('turnos')
            .insert([{
                nombre: nombre,
                apellido: apellido,
                fecha: fechaSeleccionada,
                hora: horaSeleccionada,
                imagen_url: imagenUrl
            }]);
        
        if (dbError) throw dbError;
        
        // Formatear mensaje de WhatsApp
        const fechaLegible = formatearFechaWhatsApp(fechaSeleccionada);
        const mensaje = `Hola, me llamo ${nombre} ${apellido}, reservé un turno para el día ${fechaLegible} a las ${horaSeleccionada}.`;
        
        // Codificar mensaje para URL
        const mensajeCodificado = encodeURIComponent(mensaje);
        
        // Abrir WhatsApp
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${mensajeCodificado}`, '_blank');
        
        // Mostrar éxito
        mostrarNotificacion('¡Turno reservado! Redirigiendo a WhatsApp...', 'success');
        
        // Resetear después de 2 segundos
        setTimeout(() => {
            location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al reservar: ' + error.message, 'error');
        btnReservar.disabled = false;
        btnReservar.innerHTML = textoOriginal;
    }
}

// ========== NOTIFICACIONES ==========
function mostrarNotificacion(mensaje, tipo) {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    notificacion.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${mensaje}</span>
    `;
    
    document.body.appendChild(notificacion);
    
    // Mostrar con animación
    setTimeout(() => notificacion.classList.add('show'), 10);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        notificacion.classList.remove('show');
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// ========== INICIALIZACIÓN ==========
function initClientePage() {
    // Cargar datos
    Promise.all([
        cargarTurnos(),
        cargarHorarios(),
        cargarDiasBloqueados()
    ]).then(() => {
        renderizarCalendario();
    }).catch(error => {
        console.error('Error cargando datos:', error);
        renderizarCalendario();
    });
    
    // Event listeners con debounce para rendimiento
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    const imagenInput = document.getElementById('imagen');
    const reservarBtn = document.getElementById('reservar-btn');
    const nombreInput = document.getElementById('nombre');
    const apellidoInput = document.getElementById('apellido');
    
    if (prevBtn) prevBtn.addEventListener('click', () => cambiarMes(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => cambiarMes(1));
    if (imagenInput) imagenInput.addEventListener('change', previewImagen);
    if (reservarBtn) reservarBtn.addEventListener('click', reservarTurno);
    if (nombreInput) nombreInput.addEventListener('input', debounce(validarPaso1, 300));
    if (apellidoInput) apellidoInput.addEventListener('input', debounce(validarPaso1, 300));
}

function initAdminPage() {
    Promise.all([
        cargarTurnos(),
        cargarHorarios(),
        cargarDiasBloqueados()
    ]).then(() => {
        mostrarTurnos();
        actualizarStats();
        mostrarHorariosAdmin();
        mostrarDiasBloqueados();
    });
    
    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filtrarTurnos(this.dataset.filter);
        });
    });
}

// ========== FUNCIONES ADMIN ==========
function actualizarStats() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyStr = formatearFecha(hoy);
    
    const turnosHoy = turnosCargados.filter(t => t.fecha === hoyStr).length;
    
    const semanaStr = [];
    for (let i = 0; i < 7; i++) {
        const dia = new Date(hoy);
        dia.setDate(hoy.getDate() + i);
        semanaStr.push(formatearFecha(dia));
    }
    
    const turnosSemana = turnosCargados.filter(t => semanaStr.includes(t.fecha)).length;
    const turnosPendientes = turnosCargados.filter(t => t.fecha >= hoyStr).length;
    
    const statsHoy = document.getElementById('stats-hoy');
    const statsSemana = document.getElementById('stats-semana');
    const statsPendientes = document.getElementById('stats-pendientes');
    
    if (statsHoy) statsHoy.textContent = turnosHoy;
    if (statsSemana) statsSemana.textContent = turnosSemana;
    if (statsPendientes) statsPendientes.textContent = turnosPendientes;
}

function filtrarTurnos(filtro) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyStr = formatearFecha(hoy);
    
    let turnosFiltrados = turnosCargados;
    
    if (filtro === 'hoy') {
        turnosFiltrados = turnosCargados.filter(t => t.fecha === hoyStr);
    } else if (filtro === 'semana') {
        const semanaStr = [];
        for (let i = 0; i < 7; i++) {
            const dia = new Date(hoy);
            dia.setDate(hoy.getDate() + i);
            semanaStr.push(formatearFecha(dia));
        }
        turnosFiltrados = turnosCargados.filter(t => semanaStr.includes(t.fecha));
    }
    
    mostrarTurnos(turnosFiltrados);
}

function showTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        if (btn.textContent.toLowerCase().includes(tab)) {
            btn.classList.add('active');
        }
    });
    
    const tabElement = document.getElementById(`${tab}-tab`);
    if (tabElement) {
        tabElement.classList.add('active');
    }
}

function mostrarTurnos(turnos = turnosCargados) {
    const container = document.getElementById('turnos-list');
    if (!container) return;
    
    if (turnos.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>No hay turnos reservados</p></div>';
        return;
    }
    
    const turnosHTML = turnos.sort((a, b) => {
        if (a.fecha === b.fecha) {
            return a.hora.localeCompare(b.hora);
        }
        return a.fecha.localeCompare(b.fecha);
    }).map(t => `
        <div class="turno-card">
            <div class="turno-card-header">
                <h3><i class="fas fa-user"></i> ${t.nombre} ${t.apellido}</h3>
                <span class="turno-badge">#${t.id}</span>
            </div>
            <div class="turno-card-body">
                <div class="turno-info">
                    <p><i class="fas fa-calendar"></i> ${formatearFechaLegible(t.fecha)}</p>
                    <p><i class="fas fa-clock"></i> ${t.hora} hs</p>
                </div>
                <img src="${t.imagen_url}" alt="Diseño de uñas" class="turno-imagen" onclick="window.open(this.src)" loading="lazy">
                <div class="turno-actions">
                    <button onclick="eliminarTurno(${t.id})" class="btn-eliminar">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = turnosHTML;
}

async function eliminarTurno(id) {
    if (confirm('¿Eliminar este turno?')) {
        const { error } = await supabaseClient
            .from('turnos')
            .delete()
            .eq('id', id);
        
        if (!error) {
            mostrarNotificacion('Turno eliminado', 'success');
            setTimeout(() => location.reload(), 1000);
        }
    }
}

function mostrarHorariosAdmin() {
    const container = document.getElementById('horarios-list');
    if (!container) return;
    
    if (horariosDisponibles.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-clock"></i><p>No hay horarios configurados</p></div>';
        return;
    }
    
    const horariosHTML = horariosDisponibles.sort((a, b) => a.hora.localeCompare(b.hora)).map(h => `
        <div class="horario-admin-item">
            <span class="hora">${h.hora}</span>
            <button onclick="eliminarHorario(${h.id})">
                <i class="fas fa-trash"></i> Quitar
            </button>
        </div>
    `).join('');
    
    container.innerHTML = horariosHTML;
}

async function agregarHorario() {
    const horaInput = document.getElementById('nuevo-horario');
    if (!horaInput) return;
    
    const hora = horaInput.value;
    if (!hora) {
        mostrarNotificacion('Seleccioná un horario', 'error');
        return;
    }
    
    const { error } = await supabaseClient
        .from('horarios')
        .insert([{ hora: hora, activo: true }]);
    
    if (!error) {
        mostrarNotificacion('Horario agregado', 'success');
        setTimeout(() => location.reload(), 1000);
    } else {
        mostrarNotificacion('Error: ' + error.message, 'error');
    }
}

async function eliminarHorario(id) {
    if (confirm('¿Eliminar este horario?')) {
        const { error } = await supabaseClient
            .from('horarios')
            .delete()
            .eq('id', id);
        
        if (!error) {
            mostrarNotificacion('Horario eliminado', 'success');
            setTimeout(() => location.reload(), 1000);
        }
    }
}

function mostrarDiasBloqueados() {
    const container = document.getElementById('bloqueos-list');
    if (!container) return;
    
    if (diasBloqueados.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No hay días bloqueados</p></div>';
        return;
    }
    
    const bloqueosHTML = diasBloqueados.sort((a, b) => a.fecha.localeCompare(b.fecha)).map(d => `
        <div class="bloqueo-item">
            <div class="bloqueo-info">
                <strong>${formatearFechaLegible(d.fecha)}</strong>
                ${d.motivo ? `<small>${d.motivo}</small>` : ''}
            </div>
            <button onclick="desbloquearDia(${d.id})">
                <i class="fas fa-unlock"></i> Desbloquear
            </button>
        </div>
    `).join('');
    
    container.innerHTML = bloqueosHTML;
}

async function bloquearDia() {
    const fechaInput = document.getElementById('fecha-bloqueo');
    const motivoInput = document.getElementById('motivo-bloqueo');
    
    if (!fechaInput) return;
    
    const fecha = fechaInput.value;
    const motivo = motivoInput ? motivoInput.value : '';
    
    if (!fecha) {
        mostrarNotificacion('Seleccioná una fecha', 'error');
        return;
    }
    
    const { error } = await supabaseClient
        .from('dias_bloqueados')
        .insert([{ fecha: fecha, motivo: motivo }]);
    
    if (!error) {
        mostrarNotificacion('Día bloqueado', 'success');
        setTimeout(() => location.reload(), 1000);
    }
}

async function desbloquearDia(id) {
    const { error } = await supabaseClient
        .from('dias_bloqueados')
        .delete()
        .eq('id', id);
    
    if (!error) {
        mostrarNotificacion('Día desbloqueado', 'success');
        setTimeout(() => location.reload(), 1000);
    }
}

// Hacer funciones globales
window.seleccionarDia = seleccionarDia;
window.seleccionarHora = seleccionarHora;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.showTab = showTab;
window.agregarHorario = agregarHorario;
window.eliminarHorario = eliminarHorario;
window.bloquearDia = bloquearDia;
window.desbloquearDia = desbloquearDia;
window.eliminarTurno = eliminarTurno;
window.initClientePage = initClientePage;
window.initAdminPage = initAdminPage;
