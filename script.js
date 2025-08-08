document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('waterTestForm');
    const resultsSection = document.getElementById('results');
    const loadingSection = document.getElementById('loading');
    const qualityText = document.getElementById('qualityText');
    const probabilityBar = document.getElementById('probabilityBar');
    const probabilityText = document.getElementById('probabilityText');
    const parametersTable = document.querySelector('#parametersTable tbody');
    const alertsContainer = document.getElementById('alertsContainer');

    // Load alerts on page load
    loadAlerts();

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Show loading state
        loadingSection.style.display = 'block';
        resultsSection.style.display = 'none';
        
        // Get form values
        const formData = {
            ph: parseFloat(document.getElementById('ph').value),
            turbidity: parseFloat(document.getElementById('turbidity').value),
            dissolved_oxygen: parseFloat(document.getElementById('dissolved_oxygen').value),
            conductivity: parseInt(document.getElementById('conductivity').value),
            temperature: parseFloat(document.getElementById('temperature').value),
            chlorine: parseFloat(document.getElementById('chlorine').value),
            nitrate: parseFloat(document.getElementById('nitrate').value)
        };
        
        // Send to API
        fetch('http://localhost:5001/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            // Hide loading, show results
            loadingSection.style.display = 'none';
            resultsSection.style.display = 'block';
            
            // Update results
            const isSafe = data.prediction === 0;
            const safeProbability = (data.safe_probability * 100).toFixed(1);
            const contamProbability = (data.contaminant_probability * 100).toFixed(1);
            
            qualityText.textContent = isSafe ? 'Water is SAFE to drink' : 'WARNING: Water is CONTAMINATED';
            qualityText.style.color = isSafe ? '#2ecc71' : '#e74c3c';
            
            probabilityBar.innerHTML = `<div style="width: ${safeProbability}%; background-color: ${isSafe ? '#2ecc71' : '#e74c3c'}"></div>`;
            probabilityText.textContent = isSafe ? `${safeProbability}% safe` : `${contamProbability}% contaminated`;
            
            // Update parameters table
            parametersTable.innerHTML = '';
            for (const [param, value] of Object.entries(data.parameters)) {
                const row = document.createElement('tr');
                
                const paramName = document.createElement('td');
                paramName.textContent = formatParameterName(param);
                
                const paramValue = document.createElement('td');
                paramValue.textContent = value;
                
                const paramStatus = document.createElement('td');
                const status = getParameterStatus(param, value);
                paramStatus.innerHTML = `<span class="status ${status.class}">${status.text}</span>`;
                
                row.appendChild(paramName);
                row.appendChild(paramValue);
                row.appendChild(paramStatus);
                parametersTable.appendChild(row);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            loadingSection.style.display = 'none';
            alert('Error analyzing water sample. Please try again.');
        });
    });
    
    function loadAlerts() {
        fetch('http://localhost:5001/api/alerts')
            .then(response => response.json())
            .then(alerts => {
                alertsContainer.innerHTML = '';
                
                alerts.forEach(alert => {
                    const alertElement = document.createElement('div');
                    alertElement.className = `alert ${alert.severity === 'high' ? '' : 
                                           alert.severity === 'medium' ? 'warning' : 'info'}`;
                    
                    alertElement.innerHTML = `
                        <div>
                            <h3>${alert.location} - ${alert.parameter}</h3>
                            <p>Value: ${alert.value} (Threshold: ${alert.threshold}) - ${new Date(alert.timestamp).toLocaleString()}</p>
                        </div>
                        <span class="severity ${alert.severity}">${alert.severity}</span>
                    `;
                    
                    alertsContainer.appendChild(alertElement);
                });
            })
            .catch(error => {
                console.error('Error loading alerts:', error);
                alertsContainer.innerHTML = '<p>Unable to load alerts. Please try again later.</p>';
            });
    }
    
    function formatParameterName(param) {
        const names = {
            'ph': 'pH Level',
            'turbidity': 'Turbidity',
            'dissolved_oxygen': 'Dissolved Oxygen',
            'conductivity': 'Conductivity',
            'temperature': 'Temperature',
            'chlorine': 'Chlorine',
            'nitrate': 'Nitrate'
        };
        return names[param] || param;
    }
    
    function getParameterStatus(param, value) {
        // These thresholds are simplified examples - real thresholds would be more complex
        const thresholds = {
            'ph': { min: 6.5, max: 8.5 },
            'turbidity': { max: 5 },
            'dissolved_oxygen': { min: 6 },
            'conductivity': { max: 1000 },
            'temperature': { min: 10, max: 30 },
            'chlorine': { min: 0.2, max: 4 },
            'nitrate': { max: 10 }
        };
        
        const threshold = thresholds[param];
        if (!threshold) return { class: 'safe', text: 'Normal' };
        
        let isWarning = false;
        let isDanger = false;
        
        if (threshold.min !== undefined && value < threshold.min) {
            isWarning = value >= threshold.min * 0.9;
            isDanger = value < threshold.min * 0.9;
        }
        
        if (threshold.max !== undefined && value > threshold.max) {
            isWarning = value <= threshold.max * 1.1;
            isDanger = value > threshold.max * 1.1;
        }
        
        if (isDanger) return { class: 'danger', text: 'Danger' };
        if (isWarning) return { class: 'warning', text: 'Warning' };
        return { class: 'safe', text: 'Normal' };
    }
});
