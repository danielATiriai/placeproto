// The same submit flow as the useiriai.com waitlist (landing-page/landing.js): the form posts to the
// Iriai Apps Script with ajax=1, a time-to-submit field and a honeypot, and shows a thanks state.
Array.from(document.forms).forEach((form) => {
  const endpoint = form.getAttribute("action").trim();
  form.elements.t.value = Date.now().toString();
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;
  const errorState = form.querySelector(".form-error");
  const successState = form.querySelector(".form-success");
  const privacyLine = form.querySelector(".privacy");

  const showValidation = () => {
    form.querySelectorAll(".field").forEach((field) => {
      const input = field.querySelector("input, select, textarea");
      const message = field.querySelector(".field-error");
      if (!message) return;
      message.textContent = input.validity.valid ? "" : input.validity.typeMismatch ? "Enter a valid email." : input.type === "radio" ? "Choose one." : "This field is required.";
      input.setAttribute("aria-invalid", input.validity.valid ? "false" : "true");
    });
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    form.classList.add("was-submitted");
    errorState.hidden = true;
    privacyLine.hidden = false;
    showValidation();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    submitButton.disabled = true;
    submitButton.textContent = "Sending";
    try {
      if (!endpoint || endpoint === "#") throw new Error("Missing endpoint");
      const data = new URLSearchParams(new FormData(form));
      data.set("ajax", "1");
      const response = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error("Submission failed");
      [...form.children].forEach((child) => { child.hidden = child !== successState; });
      successState.hidden = false;
      successState.focus();
    } catch {
      privacyLine.hidden = true;
      errorState.hidden = false;
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  });

  form.addEventListener("input", showValidation);
});
