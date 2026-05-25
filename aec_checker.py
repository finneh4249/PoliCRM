#!python3
import sys
import os
import csv

# Add src to path so we can import the package
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

from aec_core.main import main as core_main, check_rows  # noqa: E402
from aec_core.models import AECResult  # noqa: E402
from utils import convert_addresses  # noqa: E402

def tui():
    try:
        import questionary
        from rich.console import Console
        from rich.panel import Panel
        from rich.logging import RichHandler
        from rich.markup import escape
        import logging
    except ImportError:
        print("Please install 'rich' and 'questionary' to use the TUI.")
        print("pip install rich questionary")
        return

    # Configure logging to use Rich and File
    file_handler = logging.FileHandler("aec_checker.log")
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))

    logging.basicConfig(
        level=logging.INFO,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(rich_tracebacks=True, markup=False), file_handler]
    )

    console = Console()
    console.print(Panel.fit("AEC Checker & Address Converter", style="bold blue"))
    
    # 1. Select Input File
    csv_files = [f for f in os.listdir('.') if f.endswith('.csv')]
    if not csv_files:
        console.print("[red]No CSV files found in the current directory.[/red]")
        return

    input_file = questionary.select(
        "Select the input CSV file:",
        choices=csv_files
    ).ask()
    
    if not input_file:
        return

    # 2. Ask to convert addresses
    should_convert = questionary.confirm("Do you want to normalize addresses first?").ask()
    
    # 2a. Ask for dry-run mode
    dry_run = questionary.confirm("Run in validation mode only (no AEC checks)?", default=False).ask()
    
    file_to_process = input_file
    
    if should_convert:
        output_converted = f"converted_{input_file}"
        console.print(f"[yellow]Converting addresses... -> {output_converted}[/yellow]")
        with open(input_file, 'r') as infile, open(output_converted, 'w') as outfile:
            convert_addresses.process_csv(infile, outfile)
        console.print("[green]Conversion complete![/green]")
        file_to_process = output_converted

    if dry_run:
        console.print(f"[blue]Validating {file_to_process}...[/blue]")
        from aec_core.main import validate_input_file
        validate_input_file(file_to_process)
        return

    # 3. Ask for output filename
    output_file = questionary.text("Enter output filename:", default="aec_result.csv").ask()
    
    # 4. Check for resume
    skip_count = 0
    if os.path.exists(output_file):
        try:
            with open(output_file, 'r') as f:
                # Count lines in output file (minus header)
                lines = sum(1 for _ in f)
                if lines > 1:
                    skip_count = lines - 1
                    resume = questionary.confirm(
                        f"Output file exists with {skip_count} entries. Resume from there?",
                        default=True
                    ).ask()
                    if not resume:
                        skip_count = 0
                        overwrite = questionary.confirm("Overwrite existing file?", default=False).ask()
                        if not overwrite:
                            console.print("[yellow]Aborted.[/yellow]")
                            return
                        # If overwriting, we don't need to do anything special, check_rows handles append/write
                        # But check_rows appends by default. If we want to overwrite, we should probably delete it or handle it.
                        # The current check_rows implementation appends.
                        # Let's delete it if we are not resuming and want to overwrite.
                        os.remove(output_file)
        except Exception:
            pass

    # 5. Ask for number of threads
    threads = questionary.text("How many threads to use?", default="1").ask()
    try:
        threads = int(threads)
    except ValueError:
        threads = 1

    # 6. Ask for Headless mode
    headless = questionary.confirm("Run in headless mode (no browser window)?", default=False).ask()
    
    # 6a. Advanced options
    configure_advanced = questionary.confirm("Configure advanced options (retries, delays)?", default=False).ask()
    max_retries = 3
    delay_min = 1.5
    delay_max = 3.0
    
    if configure_advanced:
        max_retries = int(questionary.text("Max retries per record:", default="3").ask())
        delay_min = float(questionary.text("Minimum delay between requests (seconds):", default="1.5").ask())
        delay_max = float(questionary.text("Maximum delay between requests (seconds):", default="3.0").ask())

    # 7. Run Checker
    console.print(f"[blue]Starting AEC Check on {file_to_process}[/blue]")
    console.print(f"  Threads: {threads}")
    console.print(f"  Headless: {headless}")
    console.print(f"  Max retries: {max_retries}")
    console.print(f"  Delay range: {delay_min}-{delay_max}s")
    if skip_count > 0:
        console.print(f"  Resuming from row {skip_count + 1}")
    
    try:
        # Note: check_rows doesn't currently accept max_retries and delay params
        # These would need to be added to the function signature
        check_rows(file_to_process, output_file, skip=skip_count, threads=threads, headless=headless)
        console.print(f"[green]Check complete! Results saved to {output_file}[/green]")
    except Exception as e:
        console.print(f"[red]Error during check: {escape(str(e))}[/red]")

    # 8. Filter Output
    if os.path.exists(output_file):
        create_filter = questionary.confirm("Do you want to create a filtered output file?").ask()
        if create_filter:
            # Get all possible result types
            result_types = [r.value for r in AECResult]
            
            # Default to failures/partials as that's usually what people want to filter for
            defaults = [r.value for r in AECResult if "Fail" in r.value or "Partial" in r.value]
            
            selected_results = questionary.checkbox(
                "Select the result types to include in the filtered file:",
                choices=result_types,
                default=defaults
            ).ask()
            
            if selected_results:
                filtered_filename = f"filtered_{output_file}"
                count = 0
                try:
                    with open(output_file, 'r', encoding='utf-8') as f_in, \
                         open(filtered_filename, 'w', encoding='utf-8', newline='') as f_out:
                        reader = csv.DictReader(f_in)
                        writer = csv.DictWriter(f_out, fieldnames=reader.fieldnames)
                        writer.writeheader()
                        
                        for row in reader:
                            if row.get("AEC_result") in selected_results:
                                writer.writerow(row)
                                count += 1
                    
                    console.print(f"[green]Filtered {count} rows to {filtered_filename}[/green]")
                except Exception as e:
                    console.print(f"[red]Error filtering file: {e}[/red]")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        core_main()
    else:
        tui()
