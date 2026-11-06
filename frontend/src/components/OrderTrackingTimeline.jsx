export default function OrderTrackingTimeline({ orderStatus, createdAt, updatedAt }) {
  const steps = [
    { key: 'pending', label: 'Placed', icon: '📝' },
    { key: 'confirmed', label: 'Confirmed', icon: '✓' },
    { key: 'shipped', label: 'Shipped', icon: '🚚' },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵' },
    { key: 'delivered', label: 'Delivered', icon: '🏠' },
  ];

  const isCancelled = orderStatus === 'cancelled';

  const statusOrder = {
    pending: 0,
    confirmed: 1,
    shipped: 2,
    out_for_delivery: 3,
    delivered: 4,
  };

  const currentStepIndex = statusOrder[orderStatus] ?? 0;

  if (isCancelled) {
    return (
      <div className="order-timeline-container cancelled-state">
        <div className="timeline-cancelled-banner">
          <span className="cancelled-icon">🚫</span>
          <div>
            <strong>Order Cancelled</strong>
            <p>This order has been cancelled and its reserved stock has been returned to inventory.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-timeline-container" aria-label="Order Tracking Timeline">
      <div className="timeline-track">
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentStepIndex;
          const isCurrent = idx === currentStepIndex;

          return (
            <div
              key={step.key}
              className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="step-node">
                <span className="step-icon">{isCompleted ? '✓' : idx + 1}</span>
              </div>
              <div className="step-info">
                <span className="step-label">{step.label}</span>
                {isCurrent && (
                  <span className="step-time">
                    {orderStatus === 'delivered' ? 'Delivered safely' : 'In Progress'}
                  </span>
                )}
              </div>
              {idx < steps.length - 1 && (
                <div className={`step-connector ${idx < currentStepIndex ? 'filled' : ''}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
