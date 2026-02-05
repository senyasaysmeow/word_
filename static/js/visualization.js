function visualization() {
    return {
        wordsInput: '',
        loading: false,
        error: null,
        missing: [],
        hasData: false,
        chart: null,
        
        async fetchVectors() {
            if (!this.wordsInput.trim()) {
                this.error = 'Please enter some words';
                return;
            }
            
            this.loading = true;
            this.error = null;
            this.missing = [];
            
            try {
                const formData = new FormData();
                formData.append('words', this.wordsInput);
                formData.append('csrfmiddlewaretoken', window.csrfToken);
                
                const response = await fetch(window.visualizeCalculateUrl, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.error) {
                    this.error = data.error;
                    return;
                }
                
                this.missing = data.missing || [];
                this.renderChart(data.coordinates);
                
            } catch (err) {
                this.error = 'Failed to fetch vectors: ' + err.message;
            } finally {
                this.loading = false;
            }
        },
        
        renderChart(coordinates) {
            const ctx = document.getElementById('vectorChart').getContext('2d');
            
            // Destroy existing chart
            if (this.chart) {
                this.chart.destroy();
            }
            
            const words = Object.keys(coordinates);
            const dataPoints = words.map(word => ({
                x: coordinates[word].x,
                y: coordinates[word].y,
                label: word
            }));
            
            // Generate colors using HSL
            const colors = words.map((_, i) => {
                const hue = (i * 360 / words.length) % 360;
                return `hsl(${hue}, 70%, 60%)`;
            });
            
            this.chart = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: 'Word Vectors',
                        data: dataPoints,
                        backgroundColor: colors,
                        pointRadius: 8,
                        pointHoverRadius: 12,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.raw.label;
                                }
                            },
                            backgroundColor: '#000',
                            borderColor: '#66ff99',
                            borderWidth: 1,
                            titleFont: {
                                family: "'JetBrains Mono', monospace"
                            },
                            bodyFont: {
                                family: "'JetBrains Mono', monospace"
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.05)'
                            },
                            ticks: {
                                color: '#555',
                                font: {
                                    family: "'JetBrains Mono', monospace"
                                }
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.05)'
                            },
                            ticks: {
                                color: '#555',
                                font: {
                                    family: "'JetBrains Mono', monospace"
                                }
                            }
                        }
                    }
                },
                plugins: [{
                    afterDraw: (chart) => {
                        const ctx = chart.ctx;
                        ctx.save();
                        ctx.font = "12px 'JetBrains Mono', monospace";
                        ctx.fillStyle = '#e5e5e5';
                        ctx.textAlign = 'center';
                        
                        chart.data.datasets[0].data.forEach((point, i) => {
                            const meta = chart.getDatasetMeta(0);
                            const pos = meta.data[i];
                            ctx.fillText(point.label, pos.x, pos.y - 15);
                        });
                        
                        ctx.restore();
                    }
                }]
            });
            
            this.hasData = true;
        },
        
        setExample(words) {
            this.wordsInput = words;
            this.fetchVectors();
        }
    }
}
