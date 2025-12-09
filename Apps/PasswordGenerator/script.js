// DOM Elements
const passwordInput = document.getElementById("password");
const copyButton = document.getElementById("copy-btn");
const generateButton = document.getElementById("generate-btn");
const resetButton = document.getElementById("reset-btn");
const lengthSlider = document.getElementById("length");
const lengthValue = document.getElementById("length-value");
const uppercaseCheckbox = document.getElementById("uppercase");
const lowercaseCheckbox = document.getElementById("lowercase");
const numbersCheckbox = document.getElementById("numbers");
const symbolsCheckbox = document.getElementById("symbols");
const strengthBar = document.getElementById("strength-level");
const strengthLabel = document.getElementById("strength-label");
const entropyLabel = document.getElementById("entropy");
const notification = document.getElementById("notification");

// Character sets
const charSets = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

// Update length display
lengthSlider.addEventListener("input", function () {
    lengthValue.textContent = this.value;
});

// Generate password
function generatePassword() {
    const length = parseInt(lengthSlider.value);
    const includeUppercase = uppercaseCheckbox.checked;
    const includeLowercase = lowercaseCheckbox.checked;
    const includeNumbers = numbersCheckbox.checked;
    const includeSymbols = symbolsCheckbox.checked;

    // Validate at least one character type is selected
    if (!includeUppercase && !includeLowercase && !includeNumbers && !includeSymbols) {
        showNotification("Please select at least one character type!", "error");
        return;
    }

    // Build character pool
    let charPool = "";
    if (includeUppercase) charPool += charSets.uppercase;
    if (includeLowercase) charPool += charSets.lowercase;
    if (includeNumbers) charPool += charSets.numbers;
    if (includeSymbols) charPool += charSets.symbols;

    // Generate password
    let password = "";
    const poolLength = charPool.length;

    // Ensure at least one character from each selected type
    const selectedTypes = [];
    if (includeUppercase) selectedTypes.push("uppercase");
    if (includeLowercase) selectedTypes.push("lowercase");
    if (includeNumbers) selectedTypes.push("numbers");
    if (includeSymbols) selectedTypes.push("symbols");

    // Add one character from each selected type
    selectedTypes.forEach((type) => {
        const randomChar = charSets[type][Math.floor(Math.random() * charSets[type].length)];
        password += randomChar;
    });

    // Fill the rest with random characters from the pool
    for (let i = password.length; i < length; i++) {
        password += charPool[Math.floor(Math.random() * poolLength)];
    }

    // Shuffle the password to mix the guaranteed characters
    password = password
        .split("")
        .sort(() => Math.random() - 0.5)
        .join("");

    // Display password
    passwordInput.value = password;

    // Calculate and display strength
    updatePasswordStrength(password, charPool.length);
}

// Calculate password strength
function updatePasswordStrength(password, poolSize) {
    const length = password.length;
    const entropy = Math.log2(Math.pow(poolSize, length));

    // Update entropy display
    entropyLabel.textContent = `${Math.round(entropy)} bits`;

    // Update strength bar and label
    let strength = 0;
    let label = "Very Weak";
    let color = "#ff4d4d"; // Red

    if (entropy > 60) {
        strength = 100;
        label = "Very Strong";
        color = "#00cc66"; // Green
    } else if (entropy > 40) {
        strength = 75;
        label = "Strong";
        color = "#4cc9f0"; // Blue
    } else if (entropy > 25) {
        strength = 50;
        label = "Good";
        color = "#ffcc00"; // Yellow
    } else if (entropy > 15) {
        strength = 25;
        label = "Weak";
        color = "#ff9933"; // Orange
    }

    strengthBar.style.width = `${strength}%`;
    strengthBar.style.background = color;
    strengthLabel.textContent = label;
    strengthLabel.style.color = color;
}

// Copy password to clipboard
function copyToClipboard() {
    if (!passwordInput.value) {
        showNotification("No password to copy!", "error");
        return;
    }

    passwordInput.select();
    passwordInput.setSelectionRange(0, 99999); // For mobile devices

    try {
        navigator.clipboard
            .writeText(passwordInput.value)
            .then(() => {
                showNotification("Password copied to clipboard!");
            })
            .catch((err) => {
                // Fallback for older browsers
                document.execCommand("copy");
                showNotification("Password copied to clipboard!");
            });
    } catch (err) {
        // Final fallback
        document.execCommand("copy");
        showNotification("Password copied to clipboard!");
    }
}

// Show notification
function showNotification(message, type = "success") {
    notification.textContent = message;
    notification.style.background = type === "error" ? "#ff4d4d" : "#64dfdf";
    notification.classList.add("show");

    setTimeout(() => {
        notification.classList.remove("show");
    }, 3000);
}

// Reset settings
function resetSettings() {
    lengthSlider.value = 12;
    lengthValue.textContent = "12";
    uppercaseCheckbox.checked = true;
    lowercaseCheckbox.checked = true;
    numbersCheckbox.checked = true;
    symbolsCheckbox.checked = true;
    passwordInput.value = "";
    strengthBar.style.width = "0%";
    strengthLabel.textContent = "Weak";
    strengthLabel.style.color = "#ff4d4d";
    entropyLabel.textContent = "0 bits";
}

// Event listeners
copyButton.addEventListener("click", copyToClipboard);
generateButton.addEventListener("click", generatePassword);
resetButton.addEventListener("click", resetSettings);

// Generate initial password on load
window.addEventListener("load", generatePassword);

// Regenerate password when settings change
[lengthSlider, uppercaseCheckbox, lowercaseCheckbox, numbersCheckbox, symbolsCheckbox].forEach((element) => {
    element.addEventListener("change", generatePassword);
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "c") {
        copyToClipboard();
        e.preventDefault();
    }
    if (e.ctrlKey && e.key === "g") {
        generatePassword();
        e.preventDefault();
    }
    if (e.key === "Enter") {
        generatePassword();
    }
});
