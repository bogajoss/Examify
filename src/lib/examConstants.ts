// Exam page constants to avoid magic numbers
export const QUESTIONS_PER_PAGE = 50;
export const QUESTIONS_PER_PAGE_MOBILE = 50;
export const RESULTS_PER_PAGE = 50;
export const MIN_SCORE = 0;

// Timer thresholds (in seconds)
export const CRITICAL_TIME_THRESHOLD = 60; // 1 minute
export const WARNING_TIME_THRESHOLD = 300; // 5 minutes

// CSS class names for consistent styling
export const TIMER_CLASSES = {
  critical:
    "bg-destructive text-white animate-pulse scale-110 shadow-lg shadow-destructive/50",
  warning: "bg-[#f9dad7] text-destructive animate-pulse",
  normal: "bg-[#d0eeda] text-primary",
};

// Mobile breakpoints (in pixels)
export const BREAKPOINTS = {
  mobile: 640, // sm
  tablet: 768, // md
  desktop: 1024, // lg
  wide: 1280, // xl
};

// Touch target sizes (in pixels)
export const TOUCH_TARGETS = {
  small: 32, // minimum touch target
  normal: 44, // recommended touch target
  large: 56, // large touch target
};
