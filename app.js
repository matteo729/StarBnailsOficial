// Configuración de Supabase - ACTUALIZADO CON TUS DATOS
const SUPABASE_URL = 'https://linuhhqhtxrodrzuheeu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnVoaHFodHhyb2RyenVoZWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTUyMjAsImV4cCI6MjA4Nzc5MTIyMH0.oPyRsa6ZcrhijDFT-FQKjvkPTYvW5sE8C_aEt-OQ0Vc';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales
let fechaActual = new Date();
let fechaSeleccionada = null;
let horaSeleccionada = null;
let turnosCargados = [];
let horariosDisponibles = [];
let diasBloqueados = [];
let archivoImagen = null;
let currentStep = 1;

// ========== FUNCIONES COMPARTIDAS ==========
async function cargarTurnos() {
    const { data, error } = await supabaseClient
        .from('turnos')
        .select('*')
        .order('fecha', { ascending: true });
    
    if (!error) turnosCargados = data;
    return data;
}

async function cargarHorarios() {
    const { data, error } = await supabaseClient
        .from('horarios')
        .select('*')
        .eq('activo', true)
        .order('hora');
    
    if (!error) horariosDisponibles = data;
    return data;
}

async function cargarDiasBloqueados() {
    const { data, error } = await supabaseClient
        .from('dias_bloqueados')
        .select('*');
    
    if (!error) diasBloqueados = data;
    return data;
}

function formatearFecha(fecha) {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${anio}-${mes}-${dia}`;
}

function formatearFechaLegible(fechaStr) {
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

// ========== PÁGINA CLIENTE ==========
function initClientePage() {
    console.log('Inicializando página cliente...');
    
    Promise.all([
        cargarTurnos(),
        cargarHorarios(),
        cargarDiasBloqueados()
    ]).then(() => {
        console.log('Datos cargados correctamente');
        renderizarCalendario();
    }).catch(error => {
        console.error('Error cargando datos:', error);
    });
    
    // Event listeners
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
    if (nombreInput) nombreInput.addEventListener('input', validarPaso1);
    if (apellidoInput) apellidoInput.addEventListener('input', validarPaso1);
    if (imagenInput) imagenInput.addEventListener('change', validarPaso1);
}

function nextStep(step) {
    if (step === 2 && !validarPaso1()) {
        alert('Completá todos tus datos primero 💅');
        return;
    }
    
    if (step === 3 && !fechaSeleccionada) {
        alert('Seleccioná una fecha 📅');
        return;
    }
    
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
    
    document.querySelectorAll('.progress-step').forEach((el, index) => {
        if (index + 1 <= step) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
    
    document.querySelector('.progress-bar').setAttribute('data-step', step);
    currentStep = step;
    
    if (step === 3) {
        actualizarResumen();
    }
}

function prevStep(step) {
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
    
    document.querySelectorAll('.progress-step').forEach((el, index) => {
        if (index + 1 <= step) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
    
    document.querySelector('.progress-bar').setAttribute('data-step', step);
    currentStep = step;
}

function validarPaso1() {
    const nombre = document.getElementById('nombre')?.value || '';
    const apellido = document.getElementById('apellido')?.value || '';
    const imagen = document.getElementById('imagen')?.files[0];
    
    const btnToStep3 = document.getElementById('btn-to-step3');
    
    if (btnToStep3) {
        if (nombre && apellido && imagen) {
            btnToStep3.disabled = false;
            return true;
        } else {
            btnToStep3.disabled = true;
            return false;
        }
    }
    return false;
}

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
    
    // Obtener fecha de HOY para comparar
    const hoy = new Date();
    const hoyStr = formatearFecha(hoy);
    const hoyObj = new Date(hoyStr + 'T12:00:00-03:00');
    
    let dias = [];
    
    // Días del mes anterior
    const diaSemanaPrimero = primerDia.getDay();
    const diasAntes = diaSemanaPrimero === 0 ? 6 : diaSemanaPrimero - 1;
    for (let i = 0; i < diasAntes; i++) {
        dias.push({ tipo: 'empty' });
    }
    
    // Días del mes actual
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
        const fecha = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), i);
        const fechaStr = formatearFecha(fecha);
        
        // Comparar con fecha actual
        const fechaObj = new Date(fechaStr + 'T12:00:00-03:00');
        const esFechaPasada = fechaObj < hoyObj;
        const esFinde = esFinde(fecha);
        const esBloqueado = diaEstaBloqueado(fechaStr);
        const turnosEnFecha = turnosCargados.filter(t => t.fecha === fechaStr);
        
        let tipoClase = 'calendar-day';
        
        // LÓGICA CORREGIDA
        if (esFinde) {
            tipoClase += ' weekend';
        }
        else if (esFechaPasada) {
            tipoClase += ' pasado'; // Días que ya pasaron
        }
        else if (esBloqueado) {
            tipoClase += ' unavailable';
        }
        else if (turnosEnFecha.length >= horariosDisponibles.length) {
            tipoClase += ' ocupado';
        }
        else {
            tipoClase += ' available'; // Solo días FUTUROS y disponibles
        }
        
        // Determinar si es seleccionable
        const seleccionable = !esFinde && !esFechaPasada && !esBloqueado && turnosEnFecha.length < horariosDisponibles.length;
        
        dias.push({
            tipo: 'dia',
            fecha: fecha,
            fechaStr: fechaStr,
            clase: tipoClase,
            disponible: seleccionable
        });
    }
    
    const calendarHTML = dias.map(dia => {
        if (dia.tipo === 'empty') {
            return '<div class="calendar-day empty"></div>';
        } else {
            return `<div class="${dia.clase}" data-fecha="${dia.fechaStr}" onclick="${dia.disponible ? `window.seleccionarDia('${dia.fechaStr}')` : ''}">${dia.fecha.getDate()}</div>`;
        }
    }).join('');
    
    const calendarElement = document.getElementById('calendar-days');
    if (calendarElement) {
        calendarElement.innerHTML = calendarHTML;
    }
}

function seleccionarDia(fechaStr) {
    if (!fechaStr) return;
    
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    const diaElement = document.querySelector(`[data-fecha="${fechaStr}"]`);
    if (diaElement) diaElement.classList.add('selected');
    
    fechaSeleccionada = fechaStr;
    
    const fechaDisplay = document.getElementById('fecha-seleccionada-display');
    if (fechaDisplay) {
        fechaDisplay.textContent = formatearFechaLegible(fechaStr);
    }
    
    mostrarHorariosDisponibles(fechaStr);
    
    const btnToStep3 = document.getElementById('btn-to-step3');
    if (btnToStep3) btnToStep3.disabled = false;
}

function mostrarHorariosDisponibles(fechaStr) {
    const horariosContainer = document.getElementById('horarios-container');
    if (!horariosContainer) return;
    
    const turnosEnFecha = turnosCargados.filter(t => t.fecha === fechaStr);
    const horasOcupadas = turnosEnFecha.map(t => t.hora);
    
    const horariosHTML = horariosDisponibles.map(h => {
        const ocupado = horasOcupadas.includes(h.hora);
        return `<div class="horario-item ${ocupado ? 'ocupado' : ''}" 
                     data-hora="${h.hora}" 
                     onclick="${!ocupado ? `window.seleccionarHora('${h.hora}')` : ''}">
                    <span>${h.hora}</span>
                </div>`;
    }).join('');
    
    horariosContainer.innerHTML = horariosHTML;
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
    
    let resumenHTML = '';
    
    if (nombre && apellido) {
        resumenHTML += `
            <div class="resumen-item">
                <strong>Cliente</strong>
                <p>${nombre} ${apellido}</p>
            </div>
        `;
    }
    
    if (fechaSeleccionada) {
        resumenHTML += `
            <div class="resumen-item">
                <strong>Fecha</strong>
                <p>${formatearFechaLegible(fechaSeleccionada)}</p>
            </div>
        `;
    }
    
    if (horaSeleccionada) {
        resumenHTML += `
            <div class="resumen-item">
                <strong>Hora</strong>
                <p>${horaSeleccionada} hs</p>
            </div>
        `;
    }
    
    resumenContainer.innerHTML = resumenHTML || '<p>Completá los datos para ver el resumen</p>';
}

function previewImagen(event) {
    const file = event.target.files[0];
    if (file) {
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
    }
}

async function reservarTurno() {
    const nombre = document.getElementById('nombre')?.value;
    const apellido = document.getElementById('apellido')?.value;
    
    if (!nombre || !apellido || !archivoImagen || !fechaSeleccionada || !horaSeleccionada) {
        alert('Completá todos los campos 💅');
        return;
    }
    
    const btnReservar = document.getElementById('reservar-btn');
    if (btnReservar) {
        btnReservar.disabled = true;
        btnReservar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reservando...';
    }
    
    try {
        // Subir imagen a Storage
        const fileExt = archivoImagen.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabaseClient.storage
            .from('imagenes-uvas')
            .upload(fileName, archivoImagen);
        
        if (uploadError) throw uploadError;
        
        // Obtener URL pública
        const { data: { publicUrl } } = supabaseClient.storage
            .from('imagenes-uvas')
            .getPublicUrl(fileName);
        
        // Guardar turno
        const { error } = await supabaseClient
            .from('turnos')
            .insert([
                {
                    nombre: nombre,
                    apellido: apellido,
                    fecha: fechaSeleccionada,
                    hora: horaSeleccionada,
                    imagen_url: publicUrl
                }
            ]);
        
        if (error) throw error;
        
        // Mostrar modal de éxito
        const modal = document.getElementById('success-modal');
        const modalDetalle = document.querySelector('.modal-detalle');
        if (modal && modalDetalle) {
            modalDetalle.innerHTML = `
                ${nombre} ${apellido}<br>
                ${formatearFechaLegible(fechaSeleccionada)} - ${horaSeleccionada} hs
            `;
            modal.style.display = 'flex';
        }
        
        // Resetear formulario después de 2 segundos
        setTimeout(() => {
            location.reload();
        }, 3000);
        
    } catch (error) {
        alert('Error al reservar: ' + error.message);
        if (btnReservar) {
            btnReservar.disabled = false;
            btnReservar.innerHTML = '<i class="fas fa-calendar-check"></i> Confirmar reserva';
        }
    }
}

function closeModal() {
    const modal = document.getElementById('success-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    location.reload();
}

// ========== PÁGINA ADMIN ==========
function initAdminPage() {
    console.log('Inicializando panel admin...');
    
    Promise.all([
        cargarTurnos(),
        cargarHorarios(),
        cargarDiasBloqueados()
    ]).then(() => {
        console.log('Datos cargados correctamente');
        mostrarTurnos();
        actualizarStats();
        mostrarHorariosAdmin();
        mostrarDiasBloqueados();
    }).catch(error => {
        console.error('Error cargando datos:', error);
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

function actualizarStats() {
    const hoy = new Date();
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
                <img src="${t.imagen_url}" alt="Diseño de uñas" class="turno-imagen" onclick="window.open(this.src)">
                <div class="turno-actions">
                    <a href="https://wa.me/5491123456789?text=Hola%20${t.nombre}!%20Te%20recuerdo%20tu%20turno%20el%20${formatearFechaLegible(t.fecha)}%20a%20las%20${t.hora}%20✨" 
                       target="_blank" 
                       class="btn-whatsapp">
                        <i class="fab fa-whatsapp"></i> Recordar
                    </a>
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
            showNotification('Turno eliminado correctamente', 'success');
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
        showNotification('Seleccioná un horario', 'error');
        return;
    }
    
    const { error } = await supabaseClient
        .from('horarios')
        .insert([{ hora: hora, activo: true }]);
    
    if (!error) {
        showNotification('Horario agregado correctamente', 'success');
        setTimeout(() => location.reload(), 1000);
    } else {
        showNotification('Error: ' + error.message, 'error');
    }
}

async function eliminarHorario(id) {
    if (confirm('¿Eliminar este horario?')) {
        const { error } = await supabaseClient
            .from('horarios')
            .delete()
            .eq('id', id);
        
        if (!error) {
            showNotification('Horario eliminado', 'success');
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
        showNotification('Seleccioná una fecha', 'error');
        return;
    }
    
    const { error } = await supabaseClient
        .from('dias_bloqueados')
        .insert([{ fecha: fecha, motivo: motivo }]);
    
    if (!error) {
        showNotification('Día bloqueado correctamente', 'success');
        setTimeout(() => location.reload(), 1000);
    }
}

async function desbloquearDia(id) {
    const { error } = await supabaseClient
        .from('dias_bloqueados')
        .delete()
        .eq('id', id);
    
    if (!error) {
        showNotification('Día desbloqueado', 'success');
        setTimeout(() => location.reload(), 1000);
    }
}

function showNotification(mensaje, tipo) {
    const notification = document.createElement('div');
    notification.className = `notification ${tipo}`;
    notification.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${mensaje}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${tipo === 'success' ? '#51cf66' : '#ff6b6b'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
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
window.closeModal = closeModal;
window.initClientePage = initClientePage;
window.initAdminPage = initAdminPage;