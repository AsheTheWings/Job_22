export function playAct1(map) {
    return new Promise((resolve) => {
        map.flyTo({
            center: [-5.0, 31.7917], // Morocco coordinates
            zoom: 5.5,
            speed: 0.5,
            curve: 1,
            essential: true,
            pitch: 60,
            bearing: 30,
            duration: 12000
        });

        // Resolve the promise when the animation is complete
        setTimeout(resolve, 12000);
    });
} 