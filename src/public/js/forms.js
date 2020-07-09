$('.input-group input').keyup(function validate() {
    const errorSpan = $($(this).siblings('.helpText'));
    if ($(this).val().length > 0) {
        if ($(this).is(':invalid')) {
            $(this).addClass('hasError');
            errorSpan.fadeIn(200);
        } else {
            $(this).addClass('hasContent');
            $(this).removeClass('hasError');
            errorSpan.fadeOut(200);
        }
    } else {
        $(this).removeClass('hasContent hasError');
        errorSpan.fadeOut(200);
    }
});
