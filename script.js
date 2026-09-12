let ricette = {};

document.addEventListener("DOMContentLoaded", function () {
    fetch("ricette.json")
        .then(response => {
            if (!response.ok) {
                throw new Error("Impossibile caricare il file delle ricette");
            }
            return response.json();
        })
        .then(data => {
            ricette = data;
            popolaMenuRicette();
        })
        .catch(error => console.error("Errore di caricamento JSON:", error));

    function popolaMenuRicette() {
        const selectRicetta = document.getElementById("selezionaRicetta");
        if (!selectRicetta) return;
        
        selectRicetta.innerHTML = '<option value="">-- Seleziona una ricetta --</option>';
        Object.keys(ricette).forEach(ricetta => {
            let option = document.createElement("option");
            option.value = ricetta;
            option.textContent = ricetta;
            selectRicetta.appendChild(option);
        });
    }

    const selectRicettaEl = document.getElementById("selezionaRicetta");
    if (selectRicettaEl) {
        selectRicettaEl.addEventListener("change", function () {
            mostraRicetta(this.value);
        });
    }
});

function mostraRicetta(ricetta) {
    const dettagliRicetta = document.getElementById("dettagliRicetta");
    dettagliRicetta.innerHTML = "";

    if (!ricetta) return;

    const r = ricette[ricetta];

    let html = `<h2>${ricetta}</h2>`;
    html += `<p><strong>Porzioni standard:</strong> ${r.porzioni}</p>`;

    // Gestione teglia
    if (r.teglia && r.teglia.forma !== "nessuna") {
        html += `<p><strong>Teglia:</strong> ${r.teglia.forma}`;
        if (r.teglia.forma === "rettangolare") {
            html += ` (${r.teglia.larghezza}x${r.teglia.lunghezza} cm)`;
        } else if (r.teglia.forma === "tonda") {
            html += ` (diametro ${r.teglia.diametro} cm)`;
        }
        html += `</p>`;
    }

    // Foto se presente
    if (r.foto) {
        html += `<img src="${r.foto}" alt="${ricetta}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 15px;">`;
    }

    html += `<h3>Ingredienti base</h3>`;
    html += generaHTMLIngredienti(r.ingredienti);

    // Sezione di calcolo dosi dinamico
    html += `
        <hr style="margin: 20px 0;">
        <h3>Modifica quantità</h3>
        <label for="criterio">Scegli il criterio:</label>
        <select id="criterio" onchange="aggiornaECalcola()">
            <option value="porzioni">Numero di porzioni</option>
            ${r.teglia && r.teglia.forma === "tonda" ? '<option value="teglia">Diametro della teglia (cm)</option>' : ''}
        </select>
        <br><br>
        <label id="etichettaValore" for="valore">Nuovo numero di porzioni:</label><br>
        <input type="number" id="valore" value="${r.porzioni}" step="any" oninput="calcolaIngredienti()" style="width: 100%; padding: 8px; margin-top: 5px;">
        
        <div id="risultatoCalcolo" style="margin-top: 20px;"></div>
    `;

    // Procedimento se presente
    if (r.procedimento && r.procedimento.length > 0) {
        html += `<h3>Procedimento</h3><ol>`;
        r.procedimento.forEach(passo => {
            html += `<li>${passo}</li>`;
        });
        html += `</ol>`;
    }

    dettagliRicetta.innerHTML = html;
    
    // Calcola subito il risultato iniziale all'apertura
    calcolaIngredienti();
}

function generaHTMLIngredienti(obj) {
    let haSottocategorie = false;
    for (let chiave in obj) {
        if (typeof obj[chiave] === 'object' && obj[chiave] !== null && !obj[chiave].hasOwnProperty('quantità')) {
            haSottocategorie = true;
            break;
        }
    }

    let html = `<ul>`;
    if (haSottocategorie) {
        for (let categoria in obj) {
            html += `<li><strong>${categoria}</strong><ul>`;
            let sottogruppo = obj[categoria];
            for (let ing in sottogruppo) {
                let dati = sottogruppo[ing];
                html += `<li>${ing}: ${dati.quantità} ${dati.unità}</li>`;
            }
            html += `</ul></li>`;
        }
    } else {
        for (let ing in obj) {
            let dati = obj[ing];
            html += `<li>${ing}: ${dati.quantità} ${dati.unità}</li>`;
        }
    }
    html += `</ul>`;
    return html;
}

function aggiornaECalcola() {
    const criterio = document.getElementById("criterio").value;
    const etichetta = document.getElementById("etichettaValore");
    const inputValore = document.getElementById("valore");
    
    const selectRicetta = document.getElementById("selezionaRicetta");
    const r = ricette[selectRicetta.value];

    if (criterio === "porzioni") {
        etichetta.textContent = "Nuovo numero di porzioni:";
        inputValore.value = r.porzioni;
    } else if (criterio === "teglia") {
        etichetta.textContent = "Nuovo diametro della teglia (cm):";
        inputValore.value = r.teglia.diametro;
    }
    
    calcolaIngredienti();
}

function calcolaIngredienti() {
    const selectRicetta = document.getElementById("selezionaRicetta");
    if (!selectRicetta) return;
    
    const ricettaSelezionata = selectRicetta.value;
    if (!ricettaSelezionata) return;

    const r = ricette[ricettaSelezionata];
    const criterio = document.getElementById("criterio").value;
    const valore = parseFloat(document.getElementById("valore").value);
    const divRisultato = document.getElementById("risultatoCalcolo");

    if (isNaN(valore) || valore <= 0) {
        divRisultato.innerHTML = "<p style='color: red;'>Inserisci un valore valido maggiore di zero.</p>";
        return;
    }

    let fattoreScala = 1;

    if (criterio === "porzioni") {
        fattoreScala = valore / r.porzioni;
    } else if (criterio === "teglia" && r.teglia.forma === "tonda") {
        let diametroVecchio = r.teglia.diametro;
        let diametroNuovo = valore;
        fattoreScala = Math.pow(diametroNuovo / diametroVecchio, 2);
    }

    function scalaElementi(obj, fattore) {
        let resHTML = `<ul>`;
        for (let key in obj) {
            let item = obj[key];
            if (item.hasOwnProperty('quantità')) {
                let nuovaQta = item.quantità * fattore;
                if (item.unità === "uova" || item.unità === "pezzi" || item.unità === "pizzico") {
                    nuovaQta = Math.round(nuovaQta);
                    if (nuovaQta < 1 && item.quantità > 0) nuovaQta = 1;
                } else {
                    nuovaQta = Math.round(nuovaQta * 10) / 10;
                }
                resHTML += `<li><strong>${key}:</strong> ${nuovaQta} ${item.unità}</li>`;
            } else {
                resHTML += `<li><strong>${key}</strong>`;
                resHTML += scalaElementi(item, fattore);
                resHTML += `</li>`;
            }
        }
        resHTML += `</ul>`;
        return resHTML;
    }

    let htmlRisultato = `<h4>Dosi ricalcolate:</h4>`;
    htmlRisultato += scalaElementi(r.ingredienti, fattoreScala);
    divRisultato.innerHTML = htmlRisultato;
}
