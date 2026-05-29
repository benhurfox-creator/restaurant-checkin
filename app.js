const STORAGE_KEY = "restaurant-checkin-v1";

const form = document.querySelector("#restaurantForm");
const restaurantIdInput = document.querySelector("#restaurantId");
const nameInput = document.querySelector("#name");
const cuisineInput = document.querySelector("#cuisine");
const cityInput = document.querySelector("#city");
const visitDateInput = document.querySelector("#visitDate");
const ratingInput = document.querySelector("#rating");
const notesInput = document.querySelector("#notes");
const menuImagesInput = document.querySelector("#menuImages");
const previewGrid = document.querySelector("#previewGrid");
const resetButton = document.querySelector("#resetButton");
const saveButton = document.querySelector("#saveButton");
const list = document.querySelector("#restaurantList");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const totalCount = document.querySelector("#totalCount");
const photoCount = document.querySelector("#photoCount");
const galleryDialog = document.querySelector("#galleryDialog");
const galleryImage = document.querySelector("#galleryImage");
const closeGallery = document.querySelector("#closeGallery");

let restaurants = loadRestaurants();
let selectedImages = [];

visitDateInput.valueAsDate = new Date();
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const existingId = restaurantIdInput.value;
  const record = {
    id: existingId || crypto.randomUUID(),
    name: nameInput.value.trim(),
    cuisine: cuisineInput.value.trim(),
    city: cityInput.value.trim(),
    visitDate: visitDateInput.value,
    rating: ratingInput.value,
    notes: notesInput.value.trim(),
    images: selectedImages,
    updatedAt: new Date().toISOString(),
    createdAt:
      restaurants.find((restaurant) => restaurant.id === existingId)?.createdAt ||
      new Date().toISOString(),
  };

  if (!record.name) {
    nameInput.focus();
    return;
  }

  if (existingId) {
    restaurants = restaurants.map((restaurant) =>
      restaurant.id === existingId ? record : restaurant,
    );
  } else {
    restaurants = [record, ...restaurants];
  }

  saveRestaurants();
  resetForm();
  render();
});

menuImagesInput.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  const images = await Promise.all(files.map(readImage));
  selectedImages = [...selectedImages, ...images];
  menuImagesInput.value = "";
  renderPreviews();
});

resetButton.addEventListener("click", resetForm);
searchInput.addEventListener("input", renderList);
sortSelect.addEventListener("change", renderList);
closeGallery.addEventListener("click", () => galleryDialog.close());

function loadRestaurants() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRestaurants() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(restaurants));
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        src: reader.result,
      });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function render() {
  renderPreviews();
  renderStats();
  renderList();
}

function renderStats() {
  const imageTotal = restaurants.reduce(
    (sum, restaurant) => sum + restaurant.images.length,
    0,
  );
  totalCount.textContent = `${restaurants.length} 家`;
  photoCount.textContent = `${imageTotal} 张菜单`;
}

function renderPreviews() {
  previewGrid.innerHTML = "";

  selectedImages.forEach((image) => {
    const card = document.createElement("div");
    card.className = "preview-card";

    const img = document.createElement("img");
    img.src = image.src;
    img.alt = image.name || "菜单图片";

    const remove = document.createElement("button");
    remove.className = "remove-image";
    remove.type = "button";
    remove.setAttribute("aria-label", "移除图片");
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      selectedImages = selectedImages.filter((item) => item.id !== image.id);
      renderPreviews();
    });

    card.append(img, remove);
    previewGrid.append(card);
  });
}

function renderList() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = restaurants
    .filter((restaurant) => {
      const haystack = [
        restaurant.name,
        restaurant.cuisine,
        restaurant.city,
        restaurant.notes,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    })
    .sort(sortRestaurants);

  list.innerHTML = "";
  emptyState.style.display = filtered.length ? "none" : "grid";

  filtered.forEach((restaurant) => {
    list.append(createRestaurantCard(restaurant));
  });
}

function sortRestaurants(a, b) {
  const mode = sortSelect.value;

  if (mode === "rating") {
    return Number(b.rating || 0) - Number(a.rating || 0);
  }

  if (mode === "name") {
    return a.name.localeCompare(b.name, "zh-Hans-CN");
  }

  return new Date(b.visitDate || b.createdAt) - new Date(a.visitDate || a.createdAt);
}

function createRestaurantCard(restaurant) {
  const card = document.createElement("article");
  card.className = "restaurant-card";

  const cover = document.createElement("button");
  cover.className = "cover";
  cover.type = "button";
  cover.setAttribute("aria-label", `查看 ${restaurant.name} 的菜单图片`);

  if (restaurant.images[0]) {
    const coverImage = document.createElement("img");
    coverImage.src = restaurant.images[0].src;
    coverImage.alt = `${restaurant.name} 菜单`;
    cover.append(coverImage);
    cover.addEventListener("click", () => openGallery(restaurant.images[0]));
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "cover-placeholder";
    placeholder.textContent = "暂无菜单图片";
    cover.append(placeholder);
  }

  const count = document.createElement("span");
  count.className = "menu-count";
  count.textContent = `${restaurant.images.length} 张`;
  cover.append(count);

  const body = document.createElement("div");
  body.className = "card-body";

  const titleRow = document.createElement("div");
  titleRow.className = "card-title-row";

  const title = document.createElement("h2");
  title.textContent = restaurant.name;

  const rating = document.createElement("span");
  rating.className = "rating";
  rating.textContent = restaurant.rating ? `${restaurant.rating} 分` : "未评分";

  titleRow.append(title, rating);

  const meta = document.createElement("div");
  meta.className = "meta";
  [restaurant.cuisine, restaurant.city, formatDate(restaurant.visitDate)]
    .filter(Boolean)
    .forEach((value) => {
      const item = document.createElement("span");
      item.textContent = value;
      meta.append(item);
    });

  const notes = document.createElement("p");
  notes.className = "notes";
  notes.textContent = restaurant.notes || "没有备注";

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const edit = document.createElement("button");
  edit.className = "text-button";
  edit.type = "button";
  edit.textContent = "编辑";
  edit.addEventListener("click", () => editRestaurant(restaurant));

  const remove = document.createElement("button");
  remove.className = "text-button danger";
  remove.type = "button";
  remove.textContent = "删除";
  remove.addEventListener("click", () => deleteRestaurant(restaurant.id));

  actions.append(edit, remove);
  body.append(titleRow, meta, notes, actions);
  card.append(cover, body);

  return card;
}

function formatDate(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateString));
}

function openGallery(image) {
  galleryImage.src = image.src;
  galleryImage.alt = image.name || "菜单图片预览";
  galleryDialog.showModal();
}

function editRestaurant(restaurant) {
  restaurantIdInput.value = restaurant.id;
  nameInput.value = restaurant.name;
  cuisineInput.value = restaurant.cuisine;
  cityInput.value = restaurant.city;
  visitDateInput.value = restaurant.visitDate;
  ratingInput.value = restaurant.rating;
  notesInput.value = restaurant.notes;
  selectedImages = [...restaurant.images];
  saveButton.textContent = "更新餐厅";
  renderPreviews();
  nameInput.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteRestaurant(id) {
  const restaurant = restaurants.find((item) => item.id === id);
  if (!restaurant) return;

  const confirmed = confirm(`确定删除「${restaurant.name}」吗？`);
  if (!confirmed) return;

  restaurants = restaurants.filter((item) => item.id !== id);
  saveRestaurants();

  if (restaurantIdInput.value === id) {
    resetForm();
  }

  render();
}

function resetForm() {
  form.reset();
  restaurantIdInput.value = "";
  visitDateInput.valueAsDate = new Date();
  selectedImages = [];
  saveButton.textContent = "保存餐厅";
  renderPreviews();
}
