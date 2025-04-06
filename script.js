let investmentChart = null;

const form = document.getElementById('quizForm');
const resultSection = document.getElementById('resultSection');
const recommendationsDiv = document.getElementById('recommendations');
const loading = document.getElementById('loading');
const copyBtn = document.getElementById('copyBtn');
const exportBtn = document.getElementById('exportBtn');
const pdfBtn = document.getElementById('pdfBtn');
const regenerateBtn = document.getElementById('regenerateBtn');

let lastPrompt = '';

async function getRecommendations(prompt) {
  try {
    const response = await fetch('https://ef148e8b-fe3e-47ec-8cd1-1450d3f0c632-00-24lxlsqe23vhk.kirk.repl.co/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Fetch error:', err);
    return { error: err.message };
  }
}

function displayResults(resultText) {
  recommendationsDiv.innerText = resultText;
  resultSection.style.display = 'block';
}

function parseChartData(resultText) {
  const lines = resultText.split('\n');
  const labels = [];
  const values = [];

  lines.forEach(line => {
    const match = line.match(/^[1-3]\..*?\(Score:\s*(\d{1,3})\).*?:\s*(.*?)$/);
    if (match) {
      const score = parseInt(match[1], 10);
      const title = match[2].trim();
      values.push(score);
      labels.push(title);
    }
  });

  return { labels, values };
}

function drawChart(labels, values) {
  if (investmentChart) investmentChart.destroy();
  const chartCanvas = document.getElementById('chart');
  const ctx = chartCanvas.getContext('2d');

  investmentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Relevance Score',
        data: values,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        },
        x: {
          ticks: {
            callback: function (value, index, ticks) {
              const label = this.getLabelForValue(value);
              return label.length > 25 ? label.slice(0, 25) + '…' : label;
            },
            maxRotation: 0,
            minRotation: 0
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            boxWidth: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.label}: ${context.raw}`;
            }
          }
        }
      }
    }
  });
}

async function handlePrompt(prompt) {
  loading.style.display = 'block';
  resultSection.style.display = 'none';
  recommendationsDiv.innerText = '';

  const data = await getRecommendations(prompt);
  loading.style.display = 'none';

  if (data.choices && data.choices[0]?.message?.content) {
    const result = data.choices[0].message.content;
    displayResults(result);

    const { labels, values } = parseChartData(result);
    drawChart(labels, values);
  } else {
    recommendationsDiv.innerText = 'No recommendations returned or error occurred.';
    resultSection.style.display = 'block';
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const risk = document.getElementById('risk').value;
  const goal = document.getElementById('goal').value;
  const interest = document.getElementById('interest').value;

  lastPrompt = `Suggest 3 investment options for someone with ${risk} risk tolerance, aiming for ${goal} goals, and interested in ${interest}. For each option, give a one-sentence justification and a relevance score from 0 to 100 (in parentheses like 'Score: 78'). Format each item like:\n1. [Option name] (Score: [number]): Justification.`;

  await handlePrompt(lastPrompt);
});

regenerateBtn.addEventListener('click', async () => {
  if (lastPrompt) await handlePrompt(lastPrompt);
});

copyBtn.addEventListener('click', () => {
  const text = recommendationsDiv.innerText;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.innerText = 'Copied!';
    setTimeout(() => (copyBtn.innerText = 'Copy to Clipboard'), 2000);
  });
});

exportBtn.addEventListener('click', () => {
  const text = recommendationsDiv.innerText;
  if (!text) return;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'investment_recommendations.txt';
  a.click();
  URL.revokeObjectURL(url);
});

pdfBtn.addEventListener('click', () => {
  const text = recommendationsDiv.innerText;
  if (!text) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const margin = 10;
  const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const lines = doc.splitTextToSize(text, pageWidth);
  doc.text(lines, margin, 20);
  doc.save('investment_recommendations.pdf');
});
