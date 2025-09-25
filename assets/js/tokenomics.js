document.addEventListener('DOMContentLoaded', () => {
  const tokenomicsSection = document.getElementById('tokenomics');
  const ctx = document.getElementById('tokenomicsChart').getContext('2d');

  // Function to check if element is in viewport
  function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
    );
  }

  // Add pop-up class when section is in viewport
  function checkVisibility() {
    if (isInViewport(tokenomicsSection)) {
      tokenomicsSection.classList.add('pop-up');
    } else {
      tokenomicsSection.classList.remove('pop-up');
    }
  }

  // Initial check
  checkVisibility();

  // Listen for scroll events
  window.addEventListener('scroll', checkVisibility);

  // Create the donut chart
  const data = {
    labels: ['Locked', 'Staking', 'Pre-sale', 'Private Sale', ' Liquidity', 'Team', 'CEX Listings'],
    datasets: [{
      data: [80, 10, 5, 2, 1, 1, 1],
      backgroundColor: [
        '#d9f71f',
        '#4db8ff',
        '#ff4da6',
        '#ffb74d',
        '#81c784',
        '#a64dff',
        '#ffcc80'
      ],
      borderColor: '#0a001f',
      borderWidth: 2,
      hoverBorderColor: '#ffffff',
      hoverBorderWidth: 3
    }]
  };

  // Draw logo in center of donut
  const drawCenterImage = (chart) => {
    const ctx = chart.ctx;
    const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
    const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
    const imageSize = 100;
    const image = new Image();
    image.src = 'assets/favicon/android-chrome-512x512.png';
    image.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, imageSize / 2, 0, 2 * Math.PI);
      ctx.clip();
      ctx.drawImage(image, centerX - imageSize / 2, centerY - imageSize / 2, imageSize, imageSize);
      ctx.restore();
    };
  };

  const config = {
    type: 'doughnut',
    data: data,
    options: {
      responsive: false,
      cutout: '60%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#0a001f',
          titleColor: '#d9f71f',
          bodyColor: '#ffffff',
          borderColor: '#d9f71f',
          borderWidth: 1
        }
      }
    },
    plugins: [{
      id: 'centerImage',
      afterDraw(chart) {
        drawCenterImage(chart);
      }
    }]
  };

  new Chart(ctx, config);
});
