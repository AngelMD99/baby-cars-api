function fixedFoter(){
    var content_height = document.querySelector('#inner').offsetHeight;
    var number_pages = Math.ceil(content_height/1253);
    var footer_bottom = (number_pages-1)*(-100);
    var footer = document.querySelector('#footer');
    footer.style.position="absolute";
    footer.style.bottom = footer_bottom+"%";
}