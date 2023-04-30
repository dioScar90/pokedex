const getTypeColor = type => {
  const normal = '#F5F5F5'
  return {
    normal,
    fire: '#FDDFDF',
    grass: '#DEFDE0',
    electric: '#FCF7DE',
    ice: '#DEF3FD',
    water: '#DEF3FD',
    ground: '#F4E7DA',
    rock: '#D5D5D4',
    fairy: '#FCEAFF',
    poison: '#98D7A5',
    bug: '#F8D5A3',
    ghost: '#CAC0F7',
    dragon: '#97B3E6',
    psychic: '#EAEDA1',
    fighting: '#E6E0D4'
  }[type] || normal
}

const getOnlyFulfilled = async ({ arr, func }) => {
  const promises = arr.map(func);
  const responses = await Promise.allSettled(promises);
  return responses.filter(resp => resp.status == "fulfilled");
}

const getPokemonsType = async pokeApiResults => {
  const fulfilled = await getOnlyFulfilled({ arr: pokeApiResults, func: result => fetch(result.url) });
  const pokePromises = fulfilled.map(url => url.value.json());
  const pokemons = await Promise.all(pokePromises);
  return pokemons.map(fulfilled => fulfilled.types.map(info => DOMPurify.sanitize(info.type.name)));
}

const getPokemonsIds = pokeApiResults => pokeApiResults.map(({ url }) => {
  const urlAsArray = DOMPurify.sanitize(url).split('/');
  return urlAsArray.at(-2);
})

const getPokemonsImgs = async ids => {
  // const fulfilled = await getOnlyFulfilled({ arr: ids, func: id => fetch(`./assets/img/${id}.png`, { mode: "no-cors" }) });
  const fulfilled = await getOnlyFulfilled({ arr: ids, func: id => fetch(`./assets/img/${id}.png`) });
  return fulfilled.map(resp => resp.value.url);
}

const paginationInfo = (() => {
  const limit = 15;
  let offset = 0;

  const getLimit = () => limit;
  const getOffset = () => offset;
  const incrementOffset = () => offset += limit;

  return { getLimit, getOffset, incrementOffset };
})()

const getPokemons = async () => {
  try {
    const { getLimit, getOffset, incrementOffset } = paginationInfo;
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${getLimit()}&offset=${getOffset()}`);

    if (!response.ok)
      throw new Error("Deu ruim");
    
    const { results: pokeApiResults } = await response.json();
    // console.log(pokeApiResults);
    const types = await getPokemonsType(pokeApiResults);
    const ids = getPokemonsIds(pokeApiResults);
    const imgs = await getPokemonsImgs(ids);
    const pokemons = ids.map((id, i) => ({ id, name: pokeApiResults[i].name, types: types[i], imgUrl: imgs[i] }));

    incrementOffset();
    
    return pokemons;
  }
  catch (e) {
    console.error("Houve um erro: " + e);
  }
}

const renderPokemons = pokemons => {
  const ul = document.querySelector("[data-js='pokemons-list']");
  const fragment = document.createDocumentFragment();
  
  pokemons.forEach(({ id, name, types, imgUrl }) => {
    const li = document.createElement("li");
    const img = document.createElement("img");
    const nameContainer = document.createElement("h2");
    const typeContainer = document.createElement("p");
    const [firstType] = types;

    img.setAttribute("src", imgUrl);
    img.setAttribute("alt", name);
    img.classList.add("card-image");

    li.classList.add("card", firstType);
    li.style.setProperty("--type-color", getTypeColor(firstType));

    let nameUpper = name[0].toUpperCase() + name.slice(1);
    nameContainer.textContent = `${id}. ${nameUpper}`;
    typeContainer.textContent = types.length > 1 ? types.join(" | ") : firstType;

    li.append(img, nameContainer, typeContainer);

    fragment.append(li);
  })

  ul.append(fragment);
}

const observeLastPokemon = pokemonsObserver => {
  const lastPokemon = document.querySelector("[data-js='pokemons-list']").lastChild;
  pokemonsObserver.observe(lastPokemon);
}

const handleNextPokemonsRender = () => {
  const pokemonsObserver = new IntersectionObserver(async ([lastPokemon], observer) => {
    if (!lastPokemon.isIntersecting)
      return;
    
    observer.unobserve(lastPokemon.target);

    if (paginationInfo.getOffset() == 150)
      return;
    
    const pokemons = await getPokemons();
    renderPokemons(pokemons);
    observeLastPokemon(pokemonsObserver);
  }, { rootMargin: "500px" });

  observeLastPokemon(pokemonsObserver);
}

const handlePageLoaded = async () => {
  // fetch("https://pokeapi.co/api/v2/pokemon/16").then(a => a.json()).then(b => console.log(b));
  // fetch("https://pokeapi.co/api/v2/ability/51").then(a => a.json()).then(b => console.log(b));
  const pokemons = await getPokemons();
  renderPokemons(pokemons);
  handleNextPokemonsRender();
}

handlePageLoaded();