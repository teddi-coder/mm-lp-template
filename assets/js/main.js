// No libraries. No framework. Keep it that way.
//
// MECHANIC MARKETING — CLIENT LANDING PAGE TEMPLATE
// main.js
//
// This file does THREE things only:
//   1. Mobile bottom CTA bar — shows when hero scrolls out of view
//   2. Hero B form validation — validates name + phone before submit
//
// Nothing else lives here. Keep it lean.


/* ============================================================
   1. MOBILE BOTTOM CTA BAR
   ------------------------------------------------------------
   Uses IntersectionObserver to watch the hero section.
   When the hero exits the viewport (user scrolled past it),
   adds class "show-mobile-cta" to <body>.
   CSS uses that class to slide up the fixed bottom bar.
   Removes the class if the user scrolls back up to the hero.
   ============================================================ */

(function () {
  'use strict';

  var hero = document.querySelector('.hero');

  if (!hero) return;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          // Hero is visible — hide the mobile CTA bar
          document.body.classList.remove('show-mobile-cta');
        } else {
          // Hero has scrolled out of view — show the mobile CTA bar
          document.body.classList.add('show-mobile-cta');
        }
      });
    },
    {
      // Trigger when the hero is fully out of view
      threshold: 0
    }
  );

  observer.observe(hero);
}());


/* ============================================================
   2. HERO B FORM VALIDATION
   ------------------------------------------------------------
   Validates the inline quote form (Hero Variant B).
   - Name field: must not be empty
   - Phone field: must match Australian mobile or landline format
   Shows inline <span class="field-error"> below each invalid field.
   Does NOT use alert(). Prevents submit until form is valid.
   ============================================================ */

(function () {
  'use strict';

  var form = document.querySelector('.hero-form');

  if (!form) return;

  // Australian phone regex: mobile (04XX XXX XXX) or landline (02/03/07/08 XXXX XXXX)
  var phonePattern = /^(04\d{2}[\s]?\d{3}[\s]?\d{3}|0[2378][\s]?\d{4}[\s]?\d{4})$/;

  function getOrCreateError(field) {
    // Look for an existing error span immediately after the field
    var existingError = field.parentNode.querySelector('.field-error');
    if (existingError) return existingError;

    var errorSpan = document.createElement('span');
    errorSpan.className = 'field-error';
    field.parentNode.appendChild(errorSpan);
    return errorSpan;
  }

  function clearError(field) {
    var errorSpan = field.parentNode.querySelector('.field-error');
    if (errorSpan) {
      errorSpan.textContent = '';
    }
    field.style.borderColor = '';
  }

  function showError(field, message) {
    var errorSpan = getOrCreateError(field);
    errorSpan.textContent = message;
    field.style.borderColor = 'var(--brand-primary)';
  }

  form.addEventListener('submit', function (event) {
    var nameField = form.querySelector('[name="name"]');
    var phoneField = form.querySelector('[name="phone"]');
    var isValid = true;

    // Validate name
    if (nameField) {
      clearError(nameField);
      if (!nameField.value.trim()) {
        showError(nameField, 'Please enter your name.');
        isValid = false;
      }
    }

    // Validate phone
    if (phoneField) {
      clearError(phoneField);
      var phoneValue = phoneField.value.trim();
      if (!phoneValue) {
        showError(phoneField, 'Please enter your phone number.');
        isValid = false;
      } else if (!phonePattern.test(phoneValue)) {
        showError(phoneField, 'Please enter a valid Australian phone number (e.g. 0412 345 678).');
        isValid = false;
      }
    }

    if (!isValid) {
      event.preventDefault();
    }
  });

  // Clear errors on input so feedback is immediate
  form.addEventListener('input', function (event) {
    if (event.target.name === 'name' || event.target.name === 'phone') {
      clearError(event.target);
    }
  });

}());
