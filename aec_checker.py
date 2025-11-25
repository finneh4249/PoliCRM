#!python3
import sys
import os

# Add src to path so we can import the package
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

from aec_core.main import main as core_main, check_rows  # noqa: E402
import convert_addresses  # noqa: E402

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

    # Configure logging to use Rich
    logging.basicConfig(
        level=logging.INFO,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(rich_tracebacks=True, markup=False)]
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
    
    file_to_process = input_file
    
    if should_convert:
        output_converted = f"converted_{input_file}"
        console.print(f"[yellow]Converting addresses... -> {output_converted}[/yellow]")
        with open(input_file, 'r') as infile, open(output_converted, 'w') as outfile:
            convert_addresses.process_csv(infile, outfile)
        console.print("[green]Conversion complete![/green]")
        file_to_process = output_converted

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

    # 5. Run Checker
    console.print(f"[blue]Starting AEC Check on {file_to_process}...[/blue]")
    try:
        check_rows(file_to_process, output_file, skip=skip_count)
        console.print(f"[green]Check complete! Results saved to {output_file}[/green]")
    except Exception as e:
        console.print(f"[red]Error during check: {escape(str(e))}[/red]")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        core_main()
    else:
        tui()
