let ricette = {};

document.addEventListener("DOMContentLoaded", function () {
    // Carica il file JSON con le ricette
    fetch("./ricette.json")
        .then(response => response.json())
        .then(data => {
            ricette = data;
            popolaMenuRicette();
        })
        .catch(error => console.error("Errore nel caricamento delle ricette:", error));

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
            mostraIngredienti(this.value);
        });
    }

    function mostraIngredienti(ricetta) {
        const dettagliRicetta = document.getElementById("dettagliRicetta");
        dettagliRicetta.innerHTML = "";

        if (!ricetta) return;

        const datiRicetta = ricette[ricetta];

        let html = `<h2>${ricetta}</h2>`;
        html += `<p><strong>Porzioni standard:</strong> ${datiRicetta.porzioni}</p>`;

        if (datiRicetta.teglia.forma !== "nessuna") {
            html += `<p><strong>Teglia:</strong> ${datiRicetta.teglia.forma}`;
            if (datiRicetta.teglia.forma === "rettangolare") {
                html += ` (${datiRicetta.teglia.larghezza}x${datiRicetta.teglia.lunghezza} cm)`;
            } else if (datiRicetta.teglia.forma === "tonda") {
                html += ` (diametro ${datiRicetta.teglia.diametro} cm)`;
            }
            html += `</p>`;
        }

        html += `<h3>Ingredienti base</h3>`;
        html += `<ul>`;
        Object.keys(datiRicetta.ingredienti).forEach(ingrediente => {
            let datiIngrediente = datiRicetta.ingredienti[ingrediente];
            html += `<li>${ingrediente}: ${datiIngrediente.quantità} ${datiIngrediente.unità}</li>`;
        });
        html += `</ul>`;

        // Form per modificare la quantità
        html += `<h3>Modifica quantità</h3>`;
        html += `
            <label for="criterio">Scegli il criterio:</label>
            <select id="criterio">
                <option value="porzioni">Numero di porzioni</option>
                <option value="teglia">Dimensione della teglia (Area)</option>
                <option value="ingrediente">Ingrediente limitante</option>
            </select>
            <br><br>
            <input type="number" id="valore" placeholder="Inserisci il valore" step="any">
            <select id="ingredienteLimitante" style="display: none;">
                ${Object.keys(datiRicetta.ingredienti).map(ing => `<option value="${ing}">${ing}</option>`).join("")}
            </select>
            <br><br>
            <button onclick="calcolaIngredienti()">Calcola nuove dosi</button>
            
            <div id="risultatoCalcolo" style="margin-top: 20px;"></div>
        `;

        dettagliRicetta.innerHTML = html;

        document.getElementById("criterio").addEventListener("change", function () {
            if (this.value === "ingrediente") {
                document.getElementById("ingredienteLimitante").style.display = "inline-block";
                document.getElementById("valore").placeholder = "Quantità che hai";
            } else {
                document.getElementById("ingredienteLimitante").style.display = "none";
                if (this.value === "porzioni") {
                    document.getElementById("valore").placeholder = "Nuovo num. porzioni";
                } else if (this.value === "teglia") {
                    document.getElementById("valore").placeholder = "Nuova area";
                }
            }
        });
    }
});

// Funzione globale per il calcolo
function calcolaIngredienti() {
    const selectRicetta = document.getElementById("selezionaRicetta");
    if (!selectRicetta) return;
    
    const ricettaSelezionata = selectRicetta.value;
    if (!ricettaSelezionata) return;

    const criterio = document.getElementById("criterio").value;
    const valore = parseFloat(document.getElementById("valore").value);
    const datiRicetta = ricette[ricettaSelezionata];
    const divRisultato = document.getElementById("risultatoCalcolo");

    if (isNaN(valore) || valore <= 0) {
        divRisultato.innerHTML = "<p style='color: red;'>Inserisci un valore valido maggiore di zero.</p>";
        return;
    }

    let fattoreScala = 1;

    if (criterio === "porzioni") {
        fattoreScala = valore / datiRicetta.porzioni;
    } 
    else if (criterio === "teglia" && datiRicetta.teglia.forma !== "nessuna") {
        let areaBase = 1;
        if (datiRicetta.teglia.forma === "rettangolare") {
            areaBase = datiRicetta.teglia.larghezza * datiRicetta.teglia.lunghezza;
        } else if (datiRicetta.teglia.forma === "tonda") {
            areaBase = Math.PI * Math.pow(datiRicetta.teglia.diametro / 2, 2);
        }
        fattoreScala = valore / areaBase;
    } 
    else if (criterio === "ingrediente") {
        const ingScelto = document.getElementById("ingredienteLimitante").value;
        const quantitaBase = datiRicetta.ingredienti[ingScelto].quantità;
        fattoreScala = valore / quantitaBase;
    }

    let htmlRisultato = `<h4>Dosi ricalcolate:</h4><ul>`;
    Object.keys(datiRicetta.ingredienti).forEach(ingrediente => {
        let datiIng = datiRicetta.ingredienti[ingrediente];
        let nuovaQuantita = datiIng.quantità * fattoreScala;
        
        if (datiIng.unità === "uova" || datiIng.unità === "mele") {
            nuovaQuantita = Math.round(nuovaQuantita);
        } else {
            nuovaQuantita = Math.round(nuovaQuantita * 10) / 10;
        }

        htmlRisultato += `<li><strong>${ingrediente}:</strong> ${nuovaQuantita} ${datiIng.unità}</li>`;
    });
    htmlRisultato += `</ul>`;

    divRisultato.innerHTML = htmlRisultato;
}
