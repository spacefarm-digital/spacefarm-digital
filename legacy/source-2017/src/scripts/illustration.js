for (i = 0; i < 15; i++) {
  if (i != 3 && i != 9 && i != 17 && i != 23) {
    var svgns = "http://www.w3.org/2000/svg";
    var xlinkns = "http://www.w3.org/1999/xlink";

    // Get a reference to the <g> element
    var g = document.getElementById("spacefarm");

    //- Row 1
    var use1left = document.createElementNS(svgns, "use");
    use1left.setAttributeNS(xlinkns, "href", "#row-1-plant");
    use1left.setAttribute("transform", "translate (" + i * (81 - i * .2) + ", 0)")

    var use1right = document.createElementNS(svgns, "use");
    use1right.setAttributeNS(xlinkns, "href", "#row-1-plant");
    use1right.setAttribute("transform", "translate (" + -i * (81 - i * .2) + ", 0)")

    //- Row 2
    var use2left = document.createElementNS(svgns, "use");
    use2left.setAttributeNS(xlinkns, "href", "#row-2-plant");
    use2left.setAttribute("transform", "translate (" + i * (62 - i * .1) + ", 0)")

    var use2right = document.createElementNS(svgns, "use");
    use2right.setAttributeNS(xlinkns, "href", "#row-2-plant");
    use2right.setAttribute("transform", "translate (" + -i * (62 - i * .1) + ", 0)")

    //- Row 3
    var use3left = document.createElementNS(svgns, "use");
    use3left.setAttributeNS(xlinkns, "href", "#row-3-plant");
    use3left.setAttribute("transform", "translate (" + i * (46 - i * .0004) + ", 0)")

    var use3right = document.createElementNS(svgns, "use");
    use3right.setAttributeNS(xlinkns, "href", "#row-3-plant");
    use3right.setAttribute("transform", "translate (" + -i * (46 - i * .0004) + ", 0)")

    //- Row 4
    var use4left = document.createElementNS(svgns, "use");
    use4left.setAttributeNS(xlinkns, "href", "#row-4-plant");
    use4left.setAttribute("transform", "translate (" + i * (35 - i * .00005) + ", 0)")

    var use4right = document.createElementNS(svgns, "use");
    use4right.setAttributeNS(xlinkns, "href", "#row-4-plant");
    use4right.setAttribute("transform", "translate (" + -i * (35 - i * .00005) + ", 0)")

    //- Row 5
    var use5left = document.createElementNS(svgns, "use");
    use5left.setAttributeNS(xlinkns, "href", "#row-5-plant");
    use5left.setAttribute("transform", "translate (" + i * (26 - i * .0012) + ", 0)")

    var use5right = document.createElementNS(svgns, "use");
    use5right.setAttributeNS(xlinkns, "href", "#row-5-plant");
    use5right.setAttribute("transform", "translate (" + -i * (26 - i * .0012) + ", 0)")

    // Add the <use> to the <g>
    g.appendChild(use1left);
    g.appendChild(use1right);
    g.appendChild(use2left);
    g.appendChild(use2right);
    g.appendChild(use3left);
    g.appendChild(use3right);
    g.appendChild(use4left);
    g.appendChild(use4right);
    g.appendChild(use5left);
    g.appendChild(use5right);

  }
}

(function() {
  var timer;
  $(window).bind('scroll', function() {
    clearTimeout(timer);
    timer = setTimeout(refresh, 150);
  });
  var refresh = function() {
    // do stuff
    var scrollTop = $(window).scrollTop(),
      elementOffset = $('.illustration').offset().top,
      height = $('.illustration').height(),
      windowHeight = $(window).height(),
      distance = elementOffset - scrollTop - windowHeight;
  };
})();
