let cidadesDoEstado = [];
        let currentFocus = -1;
        let textoOriginal = '';

        document.querySelector('.theme-toggle').addEventListener('click', alternarTema);
        document.querySelector('form').addEventListener('submit', event => {
            event.preventDefault();
            calcularSistema();
        });
        document.getElementById('estado').addEventListener('change', carregarCidades);

        document.addEventListener("DOMContentLoaded", async () => {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                document.documentElement.setAttribute('data-theme', savedTheme);
            } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.setAttribute('data-theme', 'dark');
            }

            const selectEstado = document.getElementById('estado');
            try {
                const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
                const estados = await res.json();
                estados.forEach(uf => {
                    const option = document.createElement('option');
                    option.value = uf.sigla;
                    option.textContent = uf.sigla;
                    selectEstado.appendChild(option);
                });
            } catch (error) {
                console.error("Erro IBGE:", error);
            }
        });

        function alternarTema() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        }

        async function carregarCidades() {
            const uf = document.getElementById('estado').value;
            const inputCidade = document.getElementById('cidade');
            
            fecharLista();
            cidadesDoEstado = []; 

            if (!uf) {
                inputCidade.disabled = true;
                inputCidade.placeholder = "Aguarde o Estado";
                return;
            }

            inputCidade.disabled = true;
            inputCidade.placeholder = "Carregando...";

            try {
                const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
                cidadesDoEstado = await res.json();
                inputCidade.disabled = false;
                inputCidade.placeholder = "Nome da cidade...";
            } catch (error) {
                inputCidade.placeholder = "Erro ao carregar";
            }
        }

        // Função auxiliar para remover acentos na pesquisa
        const removeAcentos = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        document.getElementById('cidade').addEventListener('input', function(e) {
            textoOriginal = this.value;
            const valorDigitado = this.value;
            const valorLower = removeAcentos(valorDigitado.toLowerCase());
            const lista = document.getElementById('listaCidades');
            const hint = document.getElementById('cidadeHint');
            
            lista.innerHTML = '';
            hint.value = '';
            currentFocus = -1;
            
            if (valorDigitado.length >= 3) {
                const cidadesFiltradas = cidadesDoEstado.filter(cidade => 
                    removeAcentos(cidade.nome.toLowerCase()).includes(valorLower)
                );
                
                if (cidadesFiltradas.length > 0) {
                    const primeiraCidade = cidadesFiltradas[0].nome;
                    if (removeAcentos(primeiraCidade.toLowerCase()).startsWith(valorLower)) {
                        hint.value = valorDigitado + primeiraCidade.substring(valorDigitado.length);
                    }
                    
                    cidadesFiltradas.forEach(cidade => {
                        const li = document.createElement('li');
                        
                        // Garante que o recorte do negrito bata exatamente com a ocorrência ignorando acentos
                        const nomeNormalizado = removeAcentos(cidade.nome.toLowerCase());
                        const matchIndex = nomeNormalizado.indexOf(valorLower);
                        
                        const before = cidade.nome.substring(0, matchIndex);
                        const match = cidade.nome.substring(matchIndex, matchIndex + valorDigitado.length);
                        const after = cidade.nome.substring(matchIndex + valorDigitado.length);
                        
                        li.innerHTML = `<span class="text-light">${before}</span><strong>${match}</strong><span class="text-light">${after}</span>`;
                        li.dataset.nome = cidade.nome;
                        
                        li.onclick = () => {
                            document.getElementById('cidade').value = cidade.nome;
                            textoOriginal = cidade.nome;
                            fecharLista();
                        };
                        lista.appendChild(li);
                    });
                    lista.style.display = 'block';
                } else {
                    lista.style.display = 'none';
                }
            } else {
                lista.style.display = 'none';
            }
        });

        document.getElementById('cidade').addEventListener('keydown', function(e) {
            const lista = document.getElementById('listaCidades');
            const hint = document.getElementById('cidadeHint');
            let items = lista.getElementsByTagName('li');
            
            if (lista.style.display === 'block') {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    currentFocus++;
                    addActive(items);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    currentFocus--;
                    addActive(items);
                } else if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    if (currentFocus > -1 && items[currentFocus]) {
                        this.value = items[currentFocus].dataset.nome;
                        textoOriginal = this.value;
                        fecharLista();
                    } else if (hint.value) {
                        this.value = hint.value;
                        textoOriginal = this.value;
                        fecharLista();
                    }
                }
            }
        });

        function addActive(items) {
            if (!items || items.length === 0) return;
            for (let i = 0; i < items.length; i++) items[i].classList.remove('active');
            
            const input = document.getElementById('cidade');
            const hint = document.getElementById('cidadeHint');
            
            if (currentFocus >= items.length) currentFocus = -1;
            if (currentFocus < -1) currentFocus = items.length - 1;
            
            if (currentFocus === -1) {
                input.value = textoOriginal;
            } else {
                items[currentFocus].classList.add('active');
                items[currentFocus].scrollIntoView({ block: 'nearest' });
                input.value = items[currentFocus].dataset.nome;
                hint.value = '';
            }
        }

        function fecharLista() {
            document.getElementById('listaCidades').style.display = 'none';
            document.getElementById('cidadeHint').value = '';
            currentFocus = -1;
        }

        document.addEventListener('click', function(e) {
            if (!e.target.closest('.autocomplete-container')) fecharLista();
        });

        async function calcularSistema() {
            const estado = document.getElementById('estado').value;
            const cidade = document.getElementById('cidade').value;
            const consumo = parseFloat(document.getElementById('consumo').value);
            const potenciaPlaca = parseFloat(document.getElementById('potenciaPlaca').value);
            
            const btn = document.getElementById('btnConsultar');
            const loading = document.getElementById('loading');
            const resultado = document.getElementById('resultado');

            btn.disabled = true;
            btn.innerHTML = 'Consultando NASA...';
            loading.style.display = 'block';
            resultado.style.display = 'none';

            try {
                const urlGeo = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(cidade)}&state=${encodeURIComponent(estado)}&country=Brazil&format=json&limit=1`;
                const resGeo = await fetch(urlGeo);
                const dataGeo = await resGeo.json();

                if (dataGeo.length === 0) {
                    alert("Cidade não encontrada no mapa. Verifique a ortografia.");
                    throw new Error("Geocoding failed");
                }
                
                const lat = parseFloat(dataGeo[0].lat).toFixed(4);
                const lon = parseFloat(dataGeo[0].lon).toFixed(4);

                const urlNasa = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;
                const resNasa = await fetch(urlNasa);
                const dataNasa = await resNasa.json();

                const hsp = dataNasa.properties.parameter.ALLSKY_SFC_SW_DWN.ANN;

                const perdaProducao = 0.20; 
                const eficienciaSistema = 1 - perdaProducao;
                const consumoDiario = consumo / 30;
                
                const potenciaKwp = consumoDiario / (hsp * eficienciaSistema);
                const potenciaSistemaWatts = potenciaKwp * 1000;
                const qtdPlacas = Math.ceil(potenciaSistemaWatts / potenciaPlaca);
                
                const inversorMin = (potenciaKwp / 1.25).toFixed(1);
                const inversorMax = (potenciaKwp).toFixed(1);

                document.getElementById('mediaAnual').textContent = hsp.toFixed(2);
                document.getElementById('resPotenciaKwp').textContent = potenciaKwp.toFixed(2) + " kWp";
                document.getElementById('resQtdPlacas').textContent = `${qtdPlacas} unid.`;
                document.getElementById('resInversor').textContent = `${inversorMin} a ${inversorMax} kW`;
                document.getElementById('coords').textContent = `Lat: ${lat} | Lon: ${lon}`;
                
                // Constrói o link direto do Maps injetando as variáveis lat e lon
                document.getElementById('linkMaps').href = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

                loading.style.display = 'none';
                resultado.style.display = 'block';

                setTimeout(() => {
                    if (window.innerWidth < 768) {
                        resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);

                const payloadJSON = {
                    timestamp: new Date().toISOString(),
                    entradas: { estado, cidade, consumoMensal_kWh: consumo, potenciaPlaca_W: potenciaPlaca, eficiencia: `${eficienciaSistema * 100}%` },
                    geolocalizacao: { latitude: parseFloat(lat), longitude: parseFloat(lon) },
                    dimensionamento: {
                        HSP_Nasa: parseFloat(hsp.toFixed(2)),
                        potencia_kWp: parseFloat(potenciaKwp.toFixed(2)),
                        modulos: qtdPlacas,
                        inversor_kW: { min: parseFloat(inversorMin), max: parseFloat(inversorMax) }
                    }
                };

                console.group(`Dashboard Solar - ${cidade}/${estado}`);
                console.log(JSON.stringify(payloadJSON, null, 2));
                console.groupEnd();

            } catch (error) {
                loading.style.display = 'none';
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Dimensionar Sistema';
            }
        }
