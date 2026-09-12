let ricette = {};

document.addEventListener("DOMContentLoaded", function () {
    fetch("./ricette.json")
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
        .catch(error => console.error("Errore:", error));

    function popolaMenuRicette() {
        const selectRicetta = document.getElementById("selezionaRicetta");
        if (!selectRicetta) return;
        
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
    if (r.teglia) {
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

    // Funzione di supporto per capire se l'oggetto ha sottocategorie (es. Choux, Crema) o ingredienti diretti
    let haSottocategorie = false;
    for (let chiave in r.ingredienti) {
        if (typeof r.ingredienti[chiave] === 'object' && r.ingredienti[chiave] !== null && !r.ingredienti[chiave].hasOwnProperty('quantità')) {
            haSottocategorie = true;
            break;
        }
    }

    if (haSottocategorie) {
        for (let categoria in r.ingredienti) {
            html += `<h4>${categoria}</h4><ul>`;
            let sottogruppo = r.ingredienti[categoria];
            for (let ing in sottogruppo) {
                let dati = sottogruppo[ing];
                html += `<li>${ing}: ${dati.quantità} ${dati.unità}</li>`;
            }
            html += `</ul>`;
        }
    } else {
        html += `<ul>`;
        for (let ing in r.ingredienti) {
            let dati = r.ingredienti[ing];
            html += `<li>${ing}: ${dati.quantità} ${dati.unità}</li>`;
        }
        html += `</ul>`;
    }

    // Sezione di calcolo dosi
    html += `
        <h3>Modifica quantità</h3>
        <label for="criterio">Scegli il criterio:</label>
        <select id="criterio">
            <option value="porzioni">Numero di porzioni</option>
            ${r.teglia && r.teglia.forma === "tonda" ? '<option value="teglia">Dimensione della teglia (Area cm²)</option>' : ''}
        </select>
        <br><br>
        <input type="number" id="valore" value="${r.porzioni}" step="any">
        <br><br>
        <button onclick="calcolaIngredienti()">Calcola nuove dosi</button>
        
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
        let raggioBase = r.teglia.diametro / 2;
        let areaBase = Math.PI * Math.pow(raggioBase, 2);
        
        let nuovoRaggio = Math.sqrt(valore / Math.PI);
        let nuovoDiametro = nuovoRaggio * 2;
        
        let areaNuova = valore; 
        fattoreScala = areaNuova / areaBase;
    }

    let haSottocategorie = false;
    for (let chiave in r.ingredienti) {
        if (typeof r.ingredienti[chiave] === 'object' && r.ingredienti[chiave] !== null && !r.ingredienti[chiave].hasOwnProperty('quantità')) {
            haSottocategorie = true;
            break;
        }
    }

    let htmlRisultato = `<h4>Dosi ricalcolate:</h4>`;

    function scalaElementi(obj, fattore) {
        let resHTML = `<ul>`;
        for (let key in obj) {
            let item = obj[key];
            if (item.hasOwnProperty('quantità')) {
                let nuovaQta = item.quantità * fattore;
                if (item.unità === "uova" || item.unità === "pezzi") {
                    nuovaQta = Math.round(nuovaQta);
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

    htmlRisultato += scalaElementi(r.ingredienti, fattoreScala);
    divRisultato.innerHTML = htmlRisultato;
}
