import { Notify } from 'notiflix/build/notiflix-notify-aio';
import SimpleLightbox from 'simplelightbox';
import 'simplelightbox/dist/simple-lightbox.min.css';
import { elements } from './elements';
import { BASE_URL, options, getImages } from './api';
import axios from 'axios';

const { galleryEl, searchInput, searchForm, loaderEl } = elements;

let totalHits = 0;
let isLoadingMore = false;
let reachedEnd = false;

const lightbox = new SimpleLightbox('.lightbox', {
  captionsData: 'alt',
  captionDelay: 250,
  enableKeyboard: true,
  showCounter: false,
  scrollZoom: false,
  close: false,
});

searchForm.addEventListener('submit', onFormSubmit);
document.addEventListener('DOMContentLoaded', hideLoader);

function showLoader() {
  loaderEl.style.display = 'block';
}

function hideLoader() {
  loaderEl.style.display = 'none';
}

function renderGallery(hits) {
  const markup = hits
    .map(item => {
      return `
            <a href="${item.largeImageURL}" class="lightbox">
                <div class="photo-card">
                    <img src="${item.webformatURL}" alt="${item.tags}" loading="lazy" />
                    <div class="info">
                        <p class="info-item">
                            <b>Likes</b>
                            ${item.likes}
                        </p>
                        <p class="info-item">
                            <b>Views</b>
                            ${item.views}
                        </p>
                        <p class="info-item">
                            <b>Comments</b>
                            ${item.comments}
                        </p>
                        <p class="info-item">
                            <b>Downloads</b>
                            ${item.downloads}
                        </p>
                    </div>
                </div>
            </a>
            `;
    })
    .join('');

  galleryEl.insertAdjacentHTML('beforeend', markup);

  if (options.params.page * options.params.per_page >= totalHits) {
    if (!reachedEnd) {
      Notify.info("We're sorry, but you've reached the end of search results.");
      reachedEnd = true;
    }
  }
  lightbox.refresh();
}

function loadMoreImages() {
  if (isLoadingMore || reachedEnd) {
    return;
  }

  isLoadingMore = true;
  options.params.page += 1;

  showLoader();

  axios
    .get(BASE_URL, { params: options.params })
    .then(response => {
      const data = response.data;
      const hits = data.hits;
      renderGallery(hits);
    })
    .catch(err => {
      Notify.failure(err.message);
    })
    .finally(() => {
      hideLoader();
      isLoadingMore = false;
    });
}

window.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  const scrollThreshold = 300;
  if (
    scrollTop + clientHeight >= scrollHeight - scrollThreshold &&
    !isLoadingMore
  ) {
    loadMoreImages();
  }
});

async function onFormSubmit(e) {
  e.preventDefault();
  const searchQuery = searchInput.value.trim();

  if (searchQuery === '') {
    // Display a notification if the search query is empty
    Notify.info('Hey, search is empty. Please enter a query.');
    return;
  }

  options.params.q = searchQuery;
  options.params.page = 1;
  galleryEl.innerHTML = '';
  reachedEnd = false;

  try {
    showLoader();
    const data = await getImages(searchQuery);
    totalHits = data.totalHits;
    const hits = data.hits;
    if (hits.length === 0) {
      Notify.failure(
        'Sorry, there are no images matching your search query. Please try again.'
      );
    } else {
      Notify.success(`Hooray! We found ${totalHits} images.`);
      renderGallery(hits);
    }
    searchInput.value = '';
  } catch (err) {
    Notify.failure(err.message);
  } finally {
    hideLoader();
  }
}

