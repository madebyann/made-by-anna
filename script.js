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

// Estrae sia i singoli ingredienti che i totali degli ingredienti ripetuti (es. Latte, Zucchero, Uova)
function estraiMappaIngredienti(obj) {
    let singoli = [];
    let mappaTotali = {};

    function naviga(nodo, prefisso = "") {
        for (let key in nodo) {
            let item = nodo[key];
            if (item && typeof item === 'object' && item.hasOwnProperty('quantità')) {
                let etichetta = prefisso ? `${prefisso} ➔ ${key}` : key;
                let qta = parseFloat(item.quantità) || 0;
                let unita = item.unità || '';

                singoli.push({
                    chiave: etichetta,
                    nomeIngrediente: key,
                    quantita: qta,
                    unita: unita,
                    tipo: "singolo"
                });

                // Aggregazione per nome ingrediente (normalizzato in minuscolo per confronto)
                let nomeNorm = key.trim().toLowerCase();
                if (!mappaTotali[nomeNorm]) {
                    mappaTotali[nomeNorm] = {
                        nomeDispiegato: key.trim(),
                        quantitaTotale: 0,
                        unita: unita,
                        conteggio: 0
                    };
                }
                mappaTotali[nomeNorm].quantitaTotale += qta;
                mappaTotali[nomeNorm].conteggio += 1;
            } else if (item && typeof item === 'object') {
                let nuovoPrefisso = prefisso ? `${prefisso} ➔ ${key}` : key;
                naviga(item, nuovoPrefisso);
            }
        }
    }

    naviga(obj);

    // Costruiamo la lista finale opzioni: prima i totali condivisi, poi i dettagli singoli
    let opzioniFinali = [];

    // Aggiungi i totali per ingredienti che compaiono in più sotto-ricette/sezioni
    Object.keys(mappaTotali).forEach(keyNorm => {
        let tot = mappaTotali[keyNorm];
        if (tot.conteggio > 1) {
            opzioniFinali.push({
                chiave: `TOTALE ${tot.nomeDispiegato.toUpperCase()} (somma di tutte le preparazioni)`,
                quantita: tot.quantitaTotale,
                unita: tot.unita,
                tipo: "totale",
                nomeIngrediente: keyNorm
            });
        }
    });

    // Aggiungi tutti i singoli elementi della ricetta
    singoli.forEach(s => opzioniFinali.push(s));

    return opzioniFinali;
}

function mostraRicetta(ricetta) {
    const dettagliRicetta = document.getElementById("dettagliRicetta");
    if (!dettagliRicetta) return;
    dettagliRicetta.innerHTML = "";

    if (!ricetta) return;

    const r = ricette[ricetta];
    if (!r) return;

    let html = `<h2>${ricetta}</h2>`;
    html += `<p><strong>Porzioni standard:</strong> ${r.porzioni || 1}</p>`;

    // Gestione teglia
    if (r.teglia && r.teglia.forma && r.teglia.forma !== "nessuna") {
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

    // Sezione di calcolo dosi dinamico
    html += `
        <hr style="margin: 20px 0;">
        <h3>Modifica quantità</h3>
        <label for="criterio">Scegli il criterio:</label>
        <select id="criterio" onchange="aggiornaECalcola()" style="width: 100%; padding: 8px; margin-top: 5px; margin-bottom: 10px;">
            <option value="porzioni">Numero di porzioni</option>
            ${r.teglia && r.teglia.forma === "tonda" ? '<option value="teglia">Diametro della teglia (cm)</option>' : ''}
            <option value="ingrediente">Ingrediente limitante</option>
        </select>
        
        <div id="contenitoreInputCriterio"></div>
        
        <div id="risultatoCalcolo" style="margin-top: 20px;"></div>
    `;

    dettagliRicetta.innerHTML = html;
    aggiornaECalcola();
}

function aggiornaECalcola() {
    const criterio = document.getElementById("criterio").value;
    const contenitoreInput = document.getElementById("contenitoreInputCriterio");
    
    const selectRicetta = document.getElementById("selezionaRicetta");
    if (!selectRicetta) return;
    const r = ricette[selectRicetta.value];
    if (!r) return;

    if (criterio === "porzioni") {
        contenitoreInput.innerHTML = `
            <label for="valore">Nuovo numero di porzioni:</label><br>
            <input type="number" id="valore" value="${r.porzioni || 1}" step="any" oninput="calcolaIngredienti()" style="width: 100%; padding: 8px; margin-top: 5px;">
        `;
    } else if (criterio === "teglia") {
        contenitoreInput.innerHTML = `
            <label for="valore">Nuovo diametro della teglia (cm):</label><br>
            <input type="number" id="valore" value="${r.teglia ? r.teglia.diametro : ''}" step="any" oninput="calcolaIngredienti()" style="width: 100%; padding: 8px; margin-top: 5px;">
        `;
    } else if (criterio === "ingrediente") {
        const listaIng = estraiMappaIngredienti(r.ingredienti);
        let opzioniIng = listaIng.map((ing, idx) => {
            return `<option value="${idx}">${ing.chiave} (Orig: ${ing.quantita} ${ing.unita})</option>`;
        }).join("");

        contenitoreInput.innerHTML = `
            <label for="selectIngGuida">Scegli ingrediente guida:</label>
            <select id="selectIngGuida" onchange="calcolaIngredienti()" style="width: 100%; padding: 8px; margin-top: 5px; margin-bottom: 10px;">
                ${opzioniIng}
            </select>
            <br>
            <label for="valore">Quantità totale che possiedi:</label><br>
            <input type="number" id="valore" placeholder="Es. 300" step="any" oninput="calcolaIngredienti()" style="width: 100%; padding: 8px; margin-top: 5px;">
        `;
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
    const inputValore = document.getElementById("valore");
    const divRisultato = document.getElementById("risultatoCalcolo");

    if (!inputValore) return;

    const valore = parseFloat(inputValore.value);

    if (isNaN(valore) || valore <= 0) {
        divRisultato.innerHTML = "<p style='color: #d9534f;'>Inserisci un valore valido maggiore di zero.</p>";
        return;
    }

    let fattoreScala = 1;

    if (criterio === "porzioni") {
        fattoreScala = valore / (r.porzioni || 1);
    } else if (criterio === "teglia" && r.teglia && r.teglia.forma === "tonda") {
        let diametroVecchio = r.teglia.diametro;
        let diametroNuovo = valore;
        fattoreScala = Math.pow(diametroNuovo / diametroVecchio, 2);
    } else if (criterio === "ingrediente") {
        const listaIng = estraiMappaIngredienti(r.ingredienti);
        const idxIng = document.getElementById("selectIngGuida").value;
        const ingGuida = listaIng[idxIng];

        if (!ingGuida || ingGuida.quantita <= 0) {
            divRisultato.innerHTML = "<p style='color: #d9534f;'>L'ingrediente selezionato non ha una dose valida per la proporzione.</p>";
            return;
        }

        fattoreScala = valore / ingGuida.quantita;
    }

    function scalaElementi(obj, fattore) {
        let resHTML = `<ul>`;
        for (let key in obj) {
            let item = obj[key];
            if (item && typeof item === 'object' && item.hasOwnProperty('quantità')) {
                let nuovaQta = item.quantità * fattore;
                if (item.unità === "uova" || item.unità === "pezzi" || item.unità === "pizzico" || item.unità === "limone") {
                    nuovaQta = Math.round(nuovaQta);
                    if (nuovaQta < 1 && item.quantità > 0) nuovaQta = 1;
                } else {
                    nuovaQta = Math.round(nuovaQta * 10) / 10;
                }
                resHTML += `<li><strong>${key}:</strong> ${nuovaQta} ${item.unità}</li>`;
            } else if (item && typeof item === 'object') {
                resHTML += `<li><strong>${key}</strong>`;
                resHTML += scalaElementi(item, fattore);
                resHTML += `</li>`;
            }
        }
        resHTML += `</ul>`;
        return resHTML;
    }

    let htmlRisultato = `<h4>Dosi ricalcolate (fattore: ${fattoreScala.toFixed(2)}x):</h4>`;
    htmlRisultato += scalaElementi(r.ingredienti, fattoreScala);
    divRisultato.innerHTML = htmlRisultato;
}
