#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use scraper::{Html, Selector};
use itertools::{Itertools};
use thiserror;

// macro_rules! fanout {
//     ($input:expr, $($func:expr),*) => {
//         [
//             $(
//                 $func($input),
//             )*
//         ]
//     };
// }

macro_rules! fanout {
    ($input:expr; $func:expr) => (
        $crate::vec::from_elem($func($input))
    );
    ($input:expr, $($func:expr),*) => (
        vec![$($func($input)),*]
    );
}


#[derive(Debug, thiserror::Error)]
enum Error {
    #[error(transparent)]
    Io(#[from] reqwest::Error),
}

// we must manually implement serde::Serialize
impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

fn try_get_pdf(title: &str) -> &str {
    "No pdf found"
}

async fn google_scholar_search(query: &str) -> Result<(), Error> {

    let url = format!("https://scholar.google.com/scholar?q={}", query);
    let html = reqwest::get(&url)
        .await?
        .text()
        .await?;
    
    let fragment = Html::parse_document(&html);
    let elem_selector = Selector::parse("div.gs_r.gs_or.gs_scl").unwrap();
    let link_selector = Selector::parse(".gs_or_ggsm > a").unwrap();
    let title_selector = Selector::parse("h3").unwrap();
    let snippet_selector = Selector::parse(".gs_rs").unwrap();

    for element in fragment.select(&elem_selector).take(5) {
        let title_element = element.select(&title_selector).next().unwrap();
        let title = title_element
            .text()
            .collect::<Vec<_>>()
            .join("");

        let link = match element.select(&link_selector).next() {
            Some(le) => le.value().attr("href").unwrap(),
            None     => try_get_pdf(&title),
        };

        let snippet_element = element.select(&snippet_selector).next().unwrap();
        let snippet = snippet_element
            .text()
            .collect::<Vec<_>>()
            .join("");

        println!("Title: {}", title);
        println!("Link: {}", link);
        println!("Snippet: {}", snippet);
    }

    // TODO return json of the first 3 values
    /*
        fragment.select(&selector).iter()
            .map(|e| {
                title
            })
            .take(3);
    */

    Ok(())

}

async fn wiki_search(query: &str) -> Result<(), Error> {


    let url = format!("
    https://en.wikipedia.org/w/api.php?action=opensearch&search={}&limit=1&namespace=0&format=json", query);
    let html = reqwest::get(&url)
        .await?
        .text()
        .await?;
    
    Ok(())
}

#[tauri::command]
async fn process_search(query: &str) -> Result<(), Error> {

    let results = fanout!(query, google_scholar_search, google_scholar_search);

    let (good, errors) = results
        .into_iter()
        .partition_map(|r| match r {
            Ok(r) => r,
            Err(r) => "No pdf"
        });


    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![process_search])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
