import gsap from "gsap";

export const showClothAnim = (object, uniform) =>{
    const clothShowTL = gsap
        .timeline({ paused: true, defaults: { duration: 1 }, onComplete: ()=> clothShowTL.kill() })
        .fromTo(
            object.rotation,
          { y: (Math.PI / 180) * 180,},
          {
            y: 0,
            ease: "elastic.out(.75, 1)",
          },
          0
        )
        .to(
          object.scale,
          {
            y: 1,
            x: 1,
            z: 1,
            duration: 0.5,
            ease: "elastic.out(.75, 1)",
          },
          0
        )
        .fromTo(
          uniform.uRotation,
          {
            value: -5,
          },
          {
            value: 0,
            ease: "elastic.out(1,0.9)",
          },
          0
        )
        .fromTo(
         uniform.uScale,
          {
            value: 1,
          },
          {
            value: 0,
            ease: "elastic.out(1,0.5)",
          },
          0
    );
    
    return clothShowTL
}

export const hideClothAnim = (object, uniform) =>{
    const clothHideTL = gsap
        .timeline({ paused: true, defaults: { duration: .3 }, onComplete: ()=> clothHideTL.kill() })
        .to(
          object.scale,
          {
            y: 0,
            x: 0,
            z: 0,
            duration: 1,
            ease: "elastic.in(1, .8)",
          },
          0
        )
        .to(
          object.rotation,
          {
              y: (Math.PI / 180) * -180,
              ease: 'power1.out'
          },
          ">-=30%"
        )
        .to(
            uniform.uRotation,
          {
              value: 5
          },
          ">-=120%"
        )
    
    return clothHideTL
}

export const revealClothAnim = (object, rotationPhysics, uScale) =>{
    const startTL = gsap
        .timeline({
            paused: true,
            defaults: { duration: 3 },
            onComplete: () => startTL.kill(),
        })
        .from(
            object.position,
            {
                z: 2,
                ease: "elastic.out(0.75,0.75)",
            },
            0
        )
        .from(
            object.position,
            {
                y: -3,
                ease: "elastic.out(1,0.9)",
            },
            0.1
        )
        .from(
            object.rotation,
            {
                x: -(Math.PI / 180) * 30,
                ease: "elastic.out(1,0.75)",
            },
            0.2
        )
        .fromTo(
            uScale,
            {
                value: 5,
            },
            {
                value: 0,
                ease: "elastic.out(1,0.75)",
            },
            0
        )
        .fromTo(
          rotationPhysics,
          {
            momentum: 0.1,
          },
          {
            momentum: 0,
            ease: "elastic.out(1,0.3)",
          },
          0
        );
    return startTL
}