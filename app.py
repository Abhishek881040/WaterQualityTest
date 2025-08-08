from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
from datetime import datetime

app = Flask(__name__, static_folder='../frontend')
CORS(app)

# WHO Water Quality Standards (simplified)
STANDARDS = {
    'ph': {'min': 6.5, 'max': 8.5},
    'turbidity': {'max': 5},  # NTU
    'dissolved_oxygen': {'min': 6},  # mg/L
    'conductivity': {'max': 1000},  # μS/cm
    'temperature': {'min': 10, 'max': 30},  # °C
    'chlorine': {'min': 0.2, 'max': 4},  # mg/L
    'nitrate': {'max': 10}  # mg/L
}

def analyze_water_sample(sample):
    """Rule-based water quality analysis using WHO standards"""
    results = {
        'parameters': sample,
        'contaminants': [],
        'is_safe': True,
        'parameter_status': {}
    }
    
    for param, standards in STANDARDS.items():
        value = sample.get(param)
        if value is None:
            continue
            
        status = 'safe'
        
        if 'min' in standards and value < standards['min']:
            status = 'unsafe'
        if 'max' in standards and value > standards['max']:
            status = 'unsafe'
            
        results['parameter_status'][param] = status
        
        if status == 'unsafe':
            results['is_safe'] = False
            results['contaminants'].append(param)
    
    # Calculate overall safety probability
    unsafe_params = len(results['contaminants'])
    total_params = len([p for p in STANDARDS if p in sample])
    safety_prob = 1 - (unsafe_params / total_params) if total_params > 0 else 0
    
    results['safety_probability'] = round(safety_prob * 100, 2)
    results['contamination_probability'] = round(100 - safety_prob * 100, 2)
    
    return results

@app.route('/api/analyze', methods=['POST'])
def analyze_water_quality():
    try:
        data = request.json
        
        # Convert and validate input
        sample = {}
        for param in STANDARDS.keys():
            if param not in data:
                return jsonify({'error': f'Missing parameter: {param}'}), 400
            try:
                sample[param] = float(data[param])
            except (ValueError, TypeError):
                return jsonify({'error': f'Invalid value for {param}'}), 400
        
        # Analyze water sample
        analysis = analyze_water_sample(sample)
        
        return jsonify({
            'prediction': 0 if analysis['is_safe'] else 1,
            'safe_probability': analysis['safety_probability'],
            'contaminant_probability': analysis['contamination_probability'],
            'contaminants': analysis['contaminants'],
            'parameter_status': analysis['parameter_status'],
            'parameters': sample,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        app.logger.error(f"Error analyzing water sample: {str(e)}")
        return jsonify({'error': 'Error analyzing water sample. Please check your input values.'}), 500

@app.route('/api/alerts', methods=['GET'])
def get_active_alerts():
    return jsonify([
        {
            'location': 'Sample Location',
            'parameter': 'pH',
            'value': 5.2,
            'threshold': '6.5-8.5',
            'timestamp': datetime.now().isoformat(),
            'severity': 'high'
        }
    ])

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)