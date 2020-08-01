const strengths = ['.{4,}', '[A-Z]', '.{14,}', '[0-9]', '[@!#$%^&*]'];
let lastStrength = -1;
const strengthDict = [
    { color: 'red', summary: 'Why even have a password?', width: '15%' },
    { color: 'orange', summary: "I mean it's okay", width: '30%' },
    { color: 'rgb(30, 71, 255)', summary: "Now we're talking", width: '45%' },
    { color: 'greenyellow', summary: "It's over 9000!", width: '60%' },
    {
        color: 'green',
        summary: "Stop, even the NSA can't crack this",
        width: '75%',
    },
];
$('input[type="password"]').keyup(function check() {
    const password = $(this).val();
    let strength = -1;
    strengths.forEach((regex) => {
        if (RegExp(regex).test(password)) {
            strength += 1;
        }
    });

    if (lastStrength !== strength && strength >= 0) {
        $('#strength-summary').text(strengthDict[strength].summary);
        $('.bar').css({
            background: strengthDict[strength].color,
            width: strengthDict[strength].width,
        });
        lastStrength = strength;
    }
    if (strength === -1) {
        $('.bar').css('width', '0');
        $('#strength-summary').empty();
        lastStrength = strength;
    }
});
